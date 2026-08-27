import { Redis } from "@upstash/redis";

// ─────────────────────────────────────────────────────────────────────────────
// THE ops record store. One Upstash database (DECISIONS.md → "Leads are
// measured; operational records are claimed"), every operational object under
// the `ops:` prefix: ops:<object>:v1 (hash, field = id) and its capped
// ops:<object>:audit:v1 (list, newest first).
//
// This module exists so the discipline is written ONCE rather than five
// times. Partner set the pattern; Outreach, Event, Note and Spend inherit it
// here instead of copying it:
//
//   - reads on the READ-ONLY credential (a page that renders cannot mutate)
//   - writes on the read-write credential, from owner-checked actions only
//   - every write stamps who + when and appends an audit entry
//   - NO DELETES — `archived: true`, so nothing is ever silently gone
//
// The lead store is not reachable from here: nothing in this file, or in any
// module built on it, addresses a `leads:*` or `waitlist:*` key.
// ─────────────────────────────────────────────────────────────────────────────

const AUDIT_MAX = 2000; // capped index — newest first, oldest trimmed

/** Every ops object carries these. Objects add their own fields on top. */
export type OpsRecord = {
  id: string;
  archived: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type OpsAction = "create" | "update" | "archive" | "unarchive";

export type OpsAuditEntry = {
  at: string;
  by: string;
  recordId: string;
  /** Human-readable identity of the record at write time — an audit line that
   *  only carries a UUID is not an audit line anyone can read. */
  label: string;
  action: OpsAction;
};

export type OpsReadResult<T> =
  | { configured: false }
  | { configured: true; records: T[]; error: string | null };

function readOnlyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

function readWriteRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

function recordKey(object: string): string {
  return `ops:${object}:v1`;
}

function auditKey(object: string): string {
  return `ops:${object}:audit:v1`;
}

/** Upstash may hand back an already-parsed object or a JSON string depending
 *  on how the value was written. Both shapes are normal; neither is an error. */
function parseValue<T>(v: T | string): T | null {
  if (typeof v !== "string") return v ?? null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null; // skip an unparsable row rather than blanking the page
  }
}

export async function readOpsRecords<T>(object: string): Promise<OpsReadResult<T>> {
  const redis = readOnlyRedis();
  if (!redis) return { configured: false };
  try {
    const hash = await redis.hgetall<Record<string, T | string>>(recordKey(object));
    const records: T[] = [];
    for (const v of Object.values(hash ?? {})) {
      const parsed = parseValue<T>(v);
      if (parsed) records.push(parsed);
    }
    return { configured: true, records, error: null };
  } catch (err) {
    return {
      configured: true,
      records: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Fetch one record. Actions use this so an edit starts from the CURRENT
 *  stored state, never from what the client claims it was. */
export async function readOpsRecord<T>(object: string, id: string): Promise<T | null> {
  const redis = readOnlyRedis();
  if (!redis) return null;
  const v = await redis.hget<T | string>(recordKey(object), id);
  if (v === null || v === undefined) return null;
  return parseValue<T>(v);
}

/** Write path — owner-checked server actions only. The record write is the
 *  one that must succeed; the audit append is wrapped so a hiccup there can
 *  never lose the edit itself (diagnostics never outrank the record). */
export async function writeOpsRecord<T extends OpsRecord>(
  object: string,
  record: T,
  audit: OpsAuditEntry
): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("ops store not configured");
  await redis.hset(recordKey(object), { [record.id]: JSON.stringify(record) });
  try {
    await redis.lpush(auditKey(object), JSON.stringify(audit));
    await redis.ltrim(auditKey(object), 0, AUDIT_MAX - 1);
  } catch {
    // See above.
  }
}

/** The audit trail for one object, newest first. */
export async function readOpsAudit(object: string, limit = 50): Promise<OpsAuditEntry[]> {
  const redis = readOnlyRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lrange<OpsAuditEntry | string>(auditKey(object), 0, limit - 1);
    const out: OpsAuditEntry[] = [];
    for (const v of raw ?? []) {
      const parsed = parseValue<OpsAuditEntry>(v);
      if (parsed) out.push(parsed);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Build the record to write: a new one, or the existing one updated. Encodes
 * the two rules every object shares — `created*` survives every edit, and
 * `archived` is only ever changed by the archive action, never by a save.
 */
export function stampRecord<T extends OpsRecord>(
  existing: T | null,
  fields: Omit<T, keyof OpsRecord>,
  by: string,
  now: string
): T {
  return {
    ...(fields as object),
    id: existing?.id ?? crypto.randomUUID(),
    archived: existing?.archived ?? false,
    createdAt: existing?.createdAt ?? now,
    createdBy: existing?.createdBy ?? by,
    updatedAt: now,
    updatedBy: by,
  } as T;
}

/** Archive / restore, shared by every object. Returns null when the id no
 *  longer resolves — the caller turns that into a reload-the-screen error. */
export async function setOpsArchived<T extends OpsRecord>(
  object: string,
  id: string,
  archived: boolean,
  by: string,
  label: (record: T) => string
): Promise<T | null> {
  const existing = await readOpsRecord<T>(object, id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const next = { ...existing, archived, updatedAt: now, updatedBy: by };
  await writeOpsRecord(object, next, {
    at: now,
    by,
    recordId: id,
    label: label(existing),
    action: archived ? "archive" : "unarchive",
  });
  return next;
}
