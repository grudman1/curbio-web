// ─────────────────────────────────────────────────────────────────────────────
// CONTACT STORE — read/write layer.
//
// Types, identity and key layout live in config/contactStore.ts. This file is
// the Redis access: it is the only place that writes a contact record, appends
// a transition, or moves someone into the promotion queue.
//
// Every write goes through applySources(), which is what guarantees the
// transition log stays honest: a caller cannot set a status, only report what a
// platform said, and the transition is derived from the difference.
// ─────────────────────────────────────────────────────────────────────────────

import {
  K,
  TRANSITIONS_MAX,
  UNKNOWN_EVENTS_MAX,
  EMPTY_SOURCES,
  computeStatus,
  getReadOnlyRedis,
  getReadWriteRedis,
  normalizeEmail,
  isUsableEmail,
  type ContactRecord,
  type ContactSources,
  type ContactStatus,
  type StatusTransition,
} from "@/config/contactStore";

// ── Raw events ───────────────────────────────────────────────────────────────

/**
 * Persist a raw payload BEFORE anything tries to understand it.
 *
 * This runs first and its failure is loud, because a parse bug that loses an
 * event is unrecoverable while a parse bug that leaves a raw key behind is a
 * five-minute fix. Returns the key so the caller can reference it in logs.
 */
export async function persistRawEvent(
  body: string,
  meta: { receivedAt: string; eventType: string | null }
): Promise<string | null> {
  const redis = getReadWriteRedis();
  if (!redis) return null;

  const id = crypto.randomUUID().slice(0, 8);
  const key = K.rawEvent(meta.receivedAt, id);

  await redis.set(
    key,
    JSON.stringify({ receivedAt: meta.receivedAt, eventType: meta.eventType, body })
  );

  // The vocabulary we are learning. A set, so re-seeing a type is free and the
  // membership list is the answer to "what does Instantly actually send?"
  if (meta.eventType) await redis.sadd(K.seenEventTypes, meta.eventType);

  return key;
}

/** Queue an unrecognised event for a human. The raw payload is already stored;
 *  this is what puts it in front of someone rather than leaving it in a key
 *  nobody lists. */
export async function recordUnknownEvent(entry: {
  eventType: string | null;
  rawKey: string | null;
  receivedAt: string;
  preview: string;
}): Promise<void> {
  const redis = getReadWriteRedis();
  if (!redis) return;
  await redis.lpush(K.unknownEvents, JSON.stringify(entry));
  await redis.ltrim(K.unknownEvents, 0, UNKNOWN_EVENTS_MAX - 1);
}

export type UnknownEvent = {
  eventType: string | null;
  rawKey: string | null;
  receivedAt: string;
  preview: string;
};

export async function getUnknownEvents(limit = 50): Promise<UnknownEvent[]> {
  const redis = getReadOnlyRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lrange<UnknownEvent | string>(K.unknownEvents, 0, limit - 1);
    return raw.map((r) => (typeof r === "string" ? (JSON.parse(r) as UnknownEvent) : r));
  } catch {
    return [];
  }
}

/** Every event_type string we have actually received. The answer to the
 *  question this build could not answer up front. */
export async function getSeenEventTypes(): Promise<string[]> {
  const redis = getReadOnlyRedis();
  if (!redis) return [];
  try {
    return (await redis.smembers(K.seenEventTypes)) ?? [];
  } catch {
    return [];
  }
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export async function getContact(email: string): Promise<ContactRecord | null> {
  const redis = getReadOnlyRedis();
  if (!redis) return null;
  const key = normalizeEmail(email);
  if (!key) return null;
  try {
    const v = await redis.hget<ContactRecord | string>(K.contacts, key);
    if (!v) return null;
    return typeof v === "string" ? (JSON.parse(v) as ContactRecord) : v;
  } catch {
    return null;
  }
}

export async function getAllContacts(): Promise<ContactRecord[]> {
  const redis = getReadOnlyRedis();
  if (!redis) return [];
  try {
    const hash = await redis.hgetall<Record<string, ContactRecord | string>>(K.contacts);
    if (!hash) return [];
    return Object.values(hash).map((v) =>
      typeof v === "string" ? (JSON.parse(v) as ContactRecord) : v
    );
  } catch {
    return [];
  }
}

export async function countContacts(): Promise<number> {
  const redis = getReadOnlyRedis();
  if (!redis) return 0;
  try {
    return (await redis.hlen(K.contacts)) ?? 0;
  } catch {
    return 0;
  }
}

/**
 * THE write path. Merge what a platform just told us about a person, recompute
 * status, and append a transition if it moved.
 *
 * `patch` carries only the source flags the caller actually observed — an
 * Instantly webhook knows nothing about AC, and passing `acActive: false`
 * because it has no opinion would silently un-subscribe someone. Undefined
 * means "no opinion"; only booleans are applied.
 */
export async function applySources(input: {
  email: string;
  patch: Partial<ContactSources>;
  identity?: Partial<
    Pick<ContactRecord, "firstName" | "lastName" | "companyName" | "website" | "phone">
  >;
  source: string;
  campaign?: string | null;
  at?: string;
  /** Reply text to attach if this is the first qualifying event. */
  replyText?: string | null;
}): Promise<{ record: ContactRecord; transition: StatusTransition | null } | null> {
  const redis = getReadWriteRedis();
  if (!redis) return null;

  const email = normalizeEmail(input.email);
  if (!email || !isUsableEmail(email)) return null;

  const at = input.at ?? new Date().toISOString();
  const existing = await getContactRW(redis, email);

  const sources: ContactSources = { ...(existing?.sources ?? EMPTY_SOURCES) };
  for (const [k, v] of Object.entries(input.patch)) {
    if (typeof v === "boolean") (sources as Record<string, boolean>)[k] = v;
  }

  const before: ContactStatus | null = existing ? computeStatus(existing.sources) : null;
  const after = computeStatus(sources);

  const becamePositive = !existing?.sources.instantlyPositive && sources.instantlyPositive;

  const record: ContactRecord = {
    email,
    sources,
    firstName: input.identity?.firstName ?? existing?.firstName,
    lastName: input.identity?.lastName ?? existing?.lastName,
    companyName: input.identity?.companyName ?? existing?.companyName,
    website: input.identity?.website ?? existing?.website,
    phone: input.identity?.phone ?? existing?.phone,
    // Earliest qualifying event wins and is never overwritten — the queue shows
    // where someone FIRST engaged, and global lead sync means the same reply
    // can arrive again from another campaign.
    firstPositiveCampaign:
      existing?.firstPositiveCampaign ?? (becamePositive ? input.campaign ?? undefined : undefined),
    firstPositiveAt: existing?.firstPositiveAt ?? (becamePositive ? at : undefined),
    firstPositiveReplyText:
      existing?.firstPositiveReplyText ?? (becamePositive ? input.replyText ?? undefined : undefined),
    lastObservedStatus: after,
    firstSeenAt: existing?.firstSeenAt ?? at,
    updatedAt: at,
  };

  await redis.hset(K.contacts, { [email]: JSON.stringify(record) });

  let transition: StatusTransition | null = null;
  if (before !== after) {
    transition = {
      email,
      from: before,
      to: after,
      at,
      sourceCampaign: input.campaign ?? null,
      source: input.source,
    };
    // Immutable, newest first. Capped high — this is the one record that
    // cannot be rebuilt from any API.
    await redis.lpush(K.transitions, JSON.stringify(transition));
    await redis.ltrim(K.transitions, 0, TRANSITIONS_MAX - 1);
  }

  // Promotion queue membership is derived, not decided by the caller: engaged
  // in Instantly and not yet an active AC subscriber.
  if (sources.instantlyPositive && !sources.acActive) {
    await enqueueForPromotion(redis, record);
  } else if (sources.acActive) {
    await redis.hdel(K.promotionQueue, email);
  }

  return { record, transition };
}

async function getContactRW(
  redis: NonNullable<ReturnType<typeof getReadWriteRedis>>,
  email: string
): Promise<ContactRecord | null> {
  try {
    const v = await redis.hget<ContactRecord | string>(K.contacts, email);
    if (!v) return null;
    return typeof v === "string" ? (JSON.parse(v) as ContactRecord) : v;
  } catch {
    return null;
  }
}

// ── Transitions ──────────────────────────────────────────────────────────────

export async function getTransitions(limit = 200): Promise<StatusTransition[]> {
  const redis = getReadOnlyRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lrange<StatusTransition | string>(K.transitions, 0, limit - 1);
    return raw.map((r) => (typeof r === "string" ? (JSON.parse(r) as StatusTransition) : r));
  } catch {
    return [];
  }
}

export async function countTransitions(): Promise<number> {
  const redis = getReadOnlyRedis();
  if (!redis) return 0;
  try {
    return (await redis.llen(K.transitions)) ?? 0;
  } catch {
    return 0;
  }
}

// ── Promotion queue ──────────────────────────────────────────────────────────

export type PromotionEntry = {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  /** Campaign of the EARLIEST qualifying event. */
  campaign: string | null;
  /** When that event happened. */
  at: string;
  replyText: string | null;
};

async function enqueueForPromotion(
  redis: NonNullable<ReturnType<typeof getReadWriteRedis>>,
  r: ContactRecord
): Promise<void> {
  // Dedupe at the CONTACT level, not the event level. Global Lead Status
  // Synchronization is on (Settings → Preferences → "Disable Global Lead Status
  // Synchronization", off by default, and correct for a unified store): one
  // reply marks the lead in every campaign, so the same person fires several
  // events. Every event is still stored — the log is immutable — but a person
  // enters this queue once, showing the earliest qualifying event.
  const existing = await redis.hget<PromotionEntry | string>(K.promotionQueue, r.email);
  if (existing) return;

  const entry: PromotionEntry = {
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    companyName: r.companyName,
    campaign: r.firstPositiveCampaign ?? null,
    at: r.firstPositiveAt ?? r.updatedAt,
    replyText: r.firstPositiveReplyText ?? null,
  };
  await redis.hset(K.promotionQueue, { [r.email]: JSON.stringify(entry) });
}

export async function getPromotionQueue(): Promise<PromotionEntry[]> {
  const redis = getReadOnlyRedis();
  if (!redis) return [];
  try {
    const hash = await redis.hgetall<Record<string, PromotionEntry | string>>(K.promotionQueue);
    if (!hash) return [];
    const decisions = await redis.hgetall<Record<string, string>>(K.promotionDecisions);
    const decided = new Set(Object.keys(decisions ?? {}));
    return Object.values(hash)
      .map((v) => (typeof v === "string" ? (JSON.parse(v) as PromotionEntry) : v))
      .filter((e) => !decided.has(e.email))
      .sort((a, b) => (a.at < b.at ? -1 : 1));
  } catch {
    return [];
  }
}

export async function countPromotionQueue(): Promise<number> {
  return (await getPromotionQueue()).length;
}
