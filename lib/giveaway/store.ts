import { Redis } from "@upstash/redis";
import type { GiveawayEntry } from "./entry";
import type { DrawTicket } from "./draw";

// ─────────────────────────────────────────────────────────────────────────────
// THE GIVEAWAY STORE — same Upstash database as everything else, its own
// `giveaway:` prefix. One database, deliberately (DECISIONS.md → "Leads are
// measured; operational records are claimed").
//
//   giveaway:<slug>:entries    HASH   normalized email → entry JSON
//   giveaway:<slug>:ids        HASH   entry id → normalized email
//   giveaway:<slug>:log        LIST   every change, newest first
//   giveaway:<slug>:draws      LIST   every drawing ever run, newest first
//   giveaway:<slug>:draw:<id>  STRING the frozen list a drawing ran on
//   giveaway:<slug>:settings   HASH   runtime switches
//   giveaway:<slug>:leadrows   HASH   lead id → when its leads:v1 row was written
//   giveaway:<slug>:lock:<email>      STRING  one writer per person (expires)
//   giveaway:<slug>:synclock:<email>  STRING  one email-list sync per person (expires)
//
// ── Why a hash keyed by email ───────────────────────────────────────────────
// "One entry per person" is then a property of the STORE, not of code that has
// to remember to check: HSETNX on the email either creates the entry or
// reports that one exists. Two taps on the button, two tabs, or a retry on
// conference Wi-Fi cannot produce two entries, because there is nowhere to put
// the second one.
//
// ── Why entries are NOT in leads:v1 ─────────────────────────────────────────
// leads:v1 is the lead store: every row in it is posted to the app, counted on
// the dashboard as a lead, and capped at 5,000. Most entries are none of those
// things. Only an entrant who is actually handed to an HSM gets a leads:v1 row
// (lib/giveaway/appDelivery.ts writes it, in the shape lib/adminLeads.ts
// reads), so the Leads screen shows exactly the giveaway traffic that became
// leads and nothing else.
//
// ── Sandbox keys ────────────────────────────────────────────────────────────
// Preview deployments run against the PRODUCTION database (verified: the
// Upstash variables are shared across Vercel's Production and Preview
// environments). So anything not in production writes under a `:sandbox`
// segment — a click-through on a preview link can never put a row in the real
// drawing. See lib/giveaway/mode.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** Change log cap. High: this is the audit trail for a prize drawing. */
const LOG_MAX = 20000;

// One client per credential for the life of the server instance, not one per
// call. The SDK carries Upstash's read-your-writes token on the client, so a
// fresh client for every command would throw that guarantee away on a database
// with read replicas — "write the entry, read it back" is this file's whole job.
const clients = new Map<string, Redis>();

function client(token: string | undefined): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  if (!url || !token) return null;
  const key = `${url}|${token}`;
  let redis = clients.get(key);
  if (!redis) {
    redis = new Redis({ url, token });
    clients.set(key, redis);
  }
  return redis;
}

function readWriteRedis(): Redis | null {
  return client(process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN);
}

function readOnlyRedis(): Redis | null {
  return client(process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN);
}

/**
 * An error message that is safe to log or show.
 *
 * The Upstash SDK appends the failed command to its error text —
 * "…, command was: [\"HSET\",…]" — and for an entry write that command IS the
 * entry: name, email, phone. Everything from that marker on is dropped.
 */
export function safeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.split(", command was:")[0].slice(0, 300);
}

export function storeConfigured(): boolean {
  return readWriteRedis() !== null;
}

export type StoreScope = { slug: string; sandbox: boolean };

function prefix({ slug, sandbox }: StoreScope): string {
  return sandbox ? `giveaway:${slug}:sandbox` : `giveaway:${slug}`;
}

const K = {
  entries: (s: StoreScope) => `${prefix(s)}:entries`,
  ids: (s: StoreScope) => `${prefix(s)}:ids`,
  log: (s: StoreScope) => `${prefix(s)}:log`,
  draws: (s: StoreScope) => `${prefix(s)}:draws`,
  drawSnapshot: (s: StoreScope, id: string) => `${prefix(s)}:draw:${id}`,
  settings: (s: StoreScope) => `${prefix(s)}:settings`,
  leadRows: (s: StoreScope) => `${prefix(s)}:leadrows`,
  lock: (s: StoreScope, email: string) => `${prefix(s)}:lock:${email}`,
  syncLock: (s: StoreScope, email: string) => `${prefix(s)}:synclock:${email}`,
};

/** Upstash hands back a parsed object or a JSON string depending on how the
 *  value was written. Both are normal. */
function parse<T>(v: T | string | null | undefined): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

// ── One writer per person ────────────────────────────────────────────────────
//
// An entry is one JSON value, and every change to it is read → modify → write.
// Two of those running at once for the same person is how a booth bonus gets
// erased by the entrant's own in-flight submission, and — far worse — how one
// person is posted to the app twice: both requests read "not sent yet", both
// post, and the app makes two deals.
//
// So every operation that changes an entry runs inside this lock, keyed by the
// person. The second request WAITS for the first and then reads what it wrote.
// It is a plain `SET key NX PX`: atomic on the server, and it expires on its
// own, so a request that is killed mid-flight cannot hold a person forever.
//
// The expiry is longer than the longest thing done under the lock (the app's
// intake is given 8 seconds; see appDelivery.ts) and the wait is shorter than a
// request is allowed to live, so a waiter either gets the lock or gives up
// cleanly and tells the visitor to try again.

const LOCK_TTL_MS = 30_000;
const LOCK_WAIT_MS = 10_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Returned by withEntryLock when the person stayed locked for the whole wait. */
export const LOCK_BUSY = Symbol("giveaway entry is busy");

export function withEntryLock<T>(
  scope: StoreScope,
  email: string,
  work: () => Promise<T>
): Promise<T | typeof LOCK_BUSY> {
  return withLock(K.lock(scope, email), work);
}

/**
 * One email-list sync per person at a time. A SEPARATE lock from the entry's:
 * the sync is several calls to ActiveCampaign and must not hold up the
 * entrant's own next request while they run — it takes the entry lock only for
 * the instant it writes its outcome back. What this one prevents is two syncs
 * for the same contact interleaving their tag changes.
 */
export function withSyncLock<T>(
  scope: StoreScope,
  email: string,
  work: () => Promise<T>
): Promise<T | typeof LOCK_BUSY> {
  return withLock(K.syncLock(scope, email), work);
}

async function withLock<T>(key: string, work: () => Promise<T>): Promise<T | typeof LOCK_BUSY> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("giveaway store not configured");
  const token = crypto.randomUUID();
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    if ((await redis.set(key, token, { nx: true, px: LOCK_TTL_MS })) === "OK") break;
    if (Date.now() >= deadline) return LOCK_BUSY;
    await sleep(120 + Math.floor(Math.random() * 120));
  }
  try {
    return await work();
  } finally {
    try {
      // Only release a lock that is still ours — if it expired and someone
      // else holds it now, deleting it would let a third request in beside them.
      if ((await redis.get<string>(key)) === token) await redis.del(key);
    } catch {
      // It expires by itself.
    }
  }
}

/**
 * Has this lead already been given its leads:v1 row? True the FIRST time it is
 * asked about an id and false ever after — atomically, so a retried hand-off
 * re-uses the row it already has instead of adding a second one for the same
 * person.
 */
export async function claimLeadRow(scope: StoreScope, leadId: string): Promise<boolean> {
  const redis = readWriteRedis();
  if (!redis) return false;
  return (await redis.hsetnx(K.leadRows(scope), leadId, new Date().toISOString())) === 1;
}

// ── Entries ──────────────────────────────────────────────────────────────────

export async function getEntry(scope: StoreScope, email: string): Promise<GiveawayEntry | null> {
  const redis = readWriteRedis();
  if (!redis) return null;
  return parse(await redis.hget<GiveawayEntry | string>(K.entries(scope), email));
}

export async function getEntryById(scope: StoreScope, id: string): Promise<GiveawayEntry | null> {
  const redis = readWriteRedis();
  if (!redis) return null;
  const email = await redis.hget<string>(K.ids(scope), id);
  return email ? getEntry(scope, String(email)) : null;
}

/**
 * Create the entry IF NO ENTRY EXISTS for this email. Returns false when one
 * already does — the caller then updates it instead. This is the only place an
 * entry comes into existence, and it is atomic.
 */
export async function createEntry(scope: StoreScope, entry: GiveawayEntry): Promise<boolean> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("giveaway store not configured");
  const created = await redis.hsetnx(K.entries(scope), entry.email, JSON.stringify(entry));
  if (created !== 1) return false;
  await redis.hset(K.ids(scope), { [entry.id]: entry.email });
  return true;
}

/** Overwrite an existing entry. Callers read, change, and write the whole
 *  record — INSIDE withEntryLock, so nobody else's change is in between. The
 *  id → email index never changes because neither half does. */
export async function saveEntry(scope: StoreScope, entry: GiveawayEntry): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("giveaway store not configured");
  await redis.hset(K.entries(scope), { [entry.email]: JSON.stringify(entry) });
}

export type EntriesRead =
  | { configured: false }
  | { configured: true; entries: GiveawayEntry[]; error: string | null };

/** Every entry. READ-ONLY credential — a screen that renders cannot mutate. */
export async function readEntries(scope: StoreScope): Promise<EntriesRead> {
  const redis = readOnlyRedis();
  if (!redis) return { configured: false };
  try {
    const hash = await redis.hgetall<Record<string, GiveawayEntry | string>>(K.entries(scope));
    const entries: GiveawayEntry[] = [];
    for (const v of Object.values(hash ?? {})) {
      const e = parse<GiveawayEntry>(v);
      if (e) entries.push(e);
    }
    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { configured: true, entries, error: null };
  } catch (err) {
    return { configured: true, entries: [], error: safeError(err) };
  }
}

// ── Change log ───────────────────────────────────────────────────────────────

export type LogEvent = {
  at: string;
  /** Normalized email of the entry the event is about; null for a drawing. */
  email: string | null;
  /** Who did it: "entrant" for the public form, a staff email otherwise. */
  by: string;
  action:
    | "entered"
    | "updated"
    | "bonus_added"
    | "bonus_removed"
    | "sent_to_app"
    | "app_failed"
    | "email_list"
    | "setting_changed"
    | "draw"
    | "alert_test";
  detail?: string;
};

/** Append to the audit trail. Wrapped by every caller's own try/catch only
 *  where the entry itself must not be lost to a log hiccup — diagnostics never
 *  outrank the record. */
export async function appendLog(scope: StoreScope, event: LogEvent): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) return;
  try {
    await redis.lpush(K.log(scope), JSON.stringify(event));
    await redis.ltrim(K.log(scope), 0, LOG_MAX - 1);
  } catch {
    // See above.
  }
}

export async function readLog(scope: StoreScope, limit = 200): Promise<LogEvent[]> {
  const redis = readOnlyRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lrange<LogEvent | string>(K.log(scope), 0, limit - 1);
    return (raw ?? []).map((v) => parse<LogEvent>(v)).filter((e): e is LogEvent => !!e);
  } catch {
    return [];
  }
}

// ── Drawings ─────────────────────────────────────────────────────────────────

export type DrawPerson = { email: string; name: string; phone: string; entries: number };

export type DrawRecord = {
  id: string;
  giveaway: string;
  /** `practice` runs the real method on the real list and is recorded, but is
   *  labelled so it can never be mistaken for the drawing. */
  mode: "official" | "practice";
  ranAt: string;
  ranBy: string;
  algorithm: string;
  seed: string;
  /** SHA-256 of the frozen list. */
  snapshotHash: string;
  eligiblePeople: number;
  totalEntries: number;
  excluded: { tests: number; afterClose: number };
  /** The winners, in the order drawn. Every one receives the SAME whole kit:
   *  the order assigns nothing, and no prize is recorded against any name. It
   *  is kept because the recorded seed reproduces the list in exactly this
   *  order, which is what Verify re-runs.
   *
   *  (A drawing run before 2026-10-02 may carry extra `position` and `prize`
   *  fields from when each winner was to get one item. They are ignored.) */
  winners: DrawPerson[];
  /** In order. If a winner cannot be reached, the next name here takes the
   *  kit — no second drawing, and no new randomness. */
  alternates: (DrawPerson & { order: number })[];
  /** Required for any official drawing after the first. */
  note: string;
};

/** Store a drawing and the list it ran on. The list is written FIRST: a
 *  record whose list is missing cannot be verified, and an orphan list is
 *  harmless. Nothing here is ever overwritten or deleted. */
export async function saveDraw(scope: StoreScope, record: DrawRecord, tickets: DrawTicket[]): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("giveaway store not configured");
  await redis.set(K.drawSnapshot(scope, record.id), JSON.stringify(tickets));
  await redis.lpush(K.draws(scope), JSON.stringify(record));
}

export async function readDraws(scope: StoreScope): Promise<DrawRecord[]> {
  const redis = readOnlyRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lrange<DrawRecord | string>(K.draws(scope), 0, -1);
    return (raw ?? []).map((v) => parse<DrawRecord>(v)).filter((d): d is DrawRecord => !!d);
  } catch {
    return [];
  }
}

export async function readDrawSnapshot(scope: StoreScope, id: string): Promise<DrawTicket[] | null> {
  const redis = readOnlyRedis();
  if (!redis) return null;
  return parse(await redis.get<DrawTicket[] | string>(K.drawSnapshot(scope, id)));
}

// ── Settings ─────────────────────────────────────────────────────────────────

export type GiveawaySettings = {
  /**
   * Send the "eXpcon 2026 giveaway · Listing in next 90 days: …" line to the
   * app with each lead. OFF until Rich confirms the app's "requested work"
   * field is the right home for it — the lead goes either way; only the note
   * waits.
   */
  dealNote: boolean;
};

const DEFAULT_SETTINGS: GiveawaySettings = { dealNote: false };

/** Settings, defaulting to the SAFE value for anything missing or unreadable:
 *  a Redis hiccup must never turn a switch on. */
export async function readSettings(scope: StoreScope): Promise<GiveawaySettings> {
  const redis = readWriteRedis();
  if (!redis) return DEFAULT_SETTINGS;
  try {
    const hash = await redis.hgetall<Record<string, unknown>>(K.settings(scope));
    return { dealNote: String(hash?.dealNote ?? "") === "on" };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function writeSetting(
  scope: StoreScope,
  key: keyof GiveawaySettings,
  on: boolean
): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("giveaway store not configured");
  await redis.hset(K.settings(scope), { [key]: on ? "on" : "off" });
}
