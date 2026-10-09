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
//   giveaway:<slug>:deleted-backup    LIST    a copy of every HARD-deleted test
//                                             entry and its lead rows, written
//                                             before anything is removed
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
  leadRows: (s: StoreScope) => `${prefix(s)}:leadrows`,
  lock: (s: StoreScope, email: string) => `${prefix(s)}:lock:${email}`,
  syncLock: (s: StoreScope, email: string) => `${prefix(s)}:synclock:${email}`,
  backup: (s: StoreScope) => `${prefix(s)}:deleted-backup`,
  outcome: (s: StoreScope, id: string) => `${prefix(s)}:draw:${id}:outcome`,
  drawLock: (s: StoreScope, id: string) => `${prefix(s)}:drawlock:${id}`,
};

/** The lead store the Leads screen and the Hub count from. Shared with
 *  app/api/lead/route.ts and appDelivery.ts. */
const LEADS_KEY = "leads:v1";
const DELIVERY_KEY = "leads:delivery:v1";
const WAITLIST_KEY = "waitlist:leads";

/** Raw-string client: LREM must be handed the exact stored value, which the
 *  default client (it parses JSON) cannot give back. Write credential. */
function rawWriteRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token, automaticDeserialization: false });
}

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
    | "alert_test"
    | "added_manually"
    | "deleted"
    | "restored"
    | "hard_deleted"
    | "winner_status";
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

export type DrawPerson = {
  email: string;
  name: string;
  phone: string;
  entries: number;
  /** Market display name, or "Not listed". Absent on drawings run before
   *  2026-10-07; the screen looks it up from the entry then. */
  market?: string;
};

// ── After a drawing: what happened to each winner ───────────────────────────

export type WinnerState = "not_notified" | "notified" | "claimed" | "forfeited";

/**
 * Kept SEPARATE from the DrawRecord, which is the immutable result (Verify
 * re-runs it). This is what staff did afterwards: per-person status, and which
 * alternates were promoted (in order) to replace forfeited winners.
 */
export type DrawOutcome = {
  people: Record<string, { state: WinnerState; at: string; by: string; notifiedAt?: string; notifiedBy?: string }>;
  promoted: string[];
};

export async function readDrawOutcome(scope: StoreScope, drawId: string): Promise<DrawOutcome> {
  const redis = readOnlyRedis() ?? readWriteRedis();
  const empty: DrawOutcome = { people: {}, promoted: [] };
  if (!redis) return empty;
  try {
    return parse<DrawOutcome>(await redis.get<DrawOutcome | string>(K.outcome(scope, drawId))) ?? empty;
  } catch {
    return empty;
  }
}

export async function saveDrawOutcome(scope: StoreScope, drawId: string, outcome: DrawOutcome): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("giveaway store not configured");
  await redis.set(K.outcome(scope, drawId), JSON.stringify(outcome));
}

/** One status change per drawing at a time. */
export function withDrawLock<T>(scope: StoreScope, drawId: string, work: () => Promise<T>): Promise<T | typeof LOCK_BUSY> {
  return withLock(K.drawLock(scope, drawId), work);
}

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


// ── Hard delete (test entries only) ──────────────────────────────────────────

export type HardDeleteResult = { entry: boolean; leadRows: number; deliveryRecords: number; backupKey: string };

/**
 * Remove a TEST entry for good: the entry, its id lookup, its lead-row marker,
 * and its rows in leads:v1 / leads:delivery:v1 (so the Hub's counts drop). A
 * copy of everything removed is pushed to `giveaway:<slug>:deleted-backup`
 * FIRST — if that write fails, nothing is deleted.
 *
 * Callers decide WHAT is a test entry (entry.isTest); this only does it. The
 * CRM is never touched.
 */
export async function hardDeleteEntry(scope: StoreScope, entry: GiveawayEntry, by: string): Promise<HardDeleteResult> {
  const raw = rawWriteRedis();
  if (!raw) throw new Error("giveaway store not configured");
  const leadId = entry.routing.app.leadId ?? null;

  // Lead rows that belong to this entry: by lead id, or — for a row written
  // without one — by this entry's id.
  const rows = ((await raw.lrange(LEADS_KEY, 0, -1)) as string[]) ?? [];
  const mine = rows.filter((r) => {
    try {
      const l = JSON.parse(r) as { leadId?: string; giveawayEntryId?: string };
      return (leadId && l.leadId === leadId) || l.giveawayEntryId === entry.id;
    } catch {
      return false;
    }
  });
  const leadIds = new Set<string>(leadId ? [leadId] : []);
  for (const r of mine) {
    try {
      const id = (JSON.parse(r) as { leadId?: string }).leadId;
      if (id) leadIds.add(id);
    } catch {}
  }
  const delivery: Record<string, string | null> = {};
  for (const id of leadIds) delivery[id] = ((await raw.hget(DELIVERY_KEY, id)) as string | null) ?? null;

  // 1. Backup first.
  await raw.lpush(
    K.backup(scope),
    JSON.stringify({ at: new Date().toISOString(), by, entry, leadRows: mine, delivery })
  );

  // 2. Then remove.
  const removed = await raw.hdel(K.entries(scope), entry.email);
  await raw.hdel(K.ids(scope), entry.id);
  if (leadIds.size) await raw.hdel(K.leadRows(scope), ...leadIds);
  let leadRows = 0;
  for (const r of mine) leadRows += Number(await raw.lrem(LEADS_KEY, 1, r));
  let deliveryRecords = 0;
  if (leadIds.size) deliveryRecords = Number(await raw.hdel(DELIVERY_KEY, ...leadIds));
  return { entry: Number(removed) === 1, leadRows, deliveryRecords, backupKey: K.backup(scope) };
}

/** Test sign-ups on the out-of-area waitlist: name starts with ZZTEST AND the
 *  email mailbox starts with zztest (both — never a real "Test" person). */
export function isZztestIdentity(name: unknown, email: unknown): boolean {
  const n = String(name ?? "").trim();
  const mailbox = String(email ?? "").trim().toLowerCase().split("@")[0];
  return /^zztest\b/i.test(n) && /^zztest([+._-]|$)/.test(mailbox);
}

export async function readZztestWaitlist(): Promise<{ raw: string; name: string; email: string }[]> {
  const raw = rawWriteRedis();
  if (!raw) return [];
  const rows = ((await raw.lrange(WAITLIST_KEY, 0, -1)) as string[]) ?? [];
  const out: { raw: string; name: string; email: string }[] = [];
  for (const r of rows) {
    try {
      const w = JSON.parse(r) as { name?: string; email?: string };
      if (isZztestIdentity(w.name, w.email)) out.push({ raw: r, name: String(w.name), email: String(w.email) });
    } catch {}
  }
  return out;
}

/** Remove ZZTEST waitlist sign-ups, backing each up first. */
export async function deleteZztestWaitlist(scope: StoreScope, by: string): Promise<number> {
  const raw = rawWriteRedis();
  if (!raw) return 0;
  const rows = await readZztestWaitlist();
  if (!rows.length) return 0;
  await raw.lpush(
    K.backup(scope),
    JSON.stringify({ at: new Date().toISOString(), by, waitlist: rows.map((r) => r.raw) })
  );
  let n = 0;
  for (const r of rows) n += Number(await raw.lrem(WAITLIST_KEY, 1, r.raw));
  return n;
}

export function backupKey(scope: StoreScope): string {
  return K.backup(scope);
}
