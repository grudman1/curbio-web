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

function readWriteRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

function readOnlyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
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
 *  record; the id → email index never changes because neither half does. */
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
    return { configured: true, entries: [], error: err instanceof Error ? err.message : String(err) };
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
    | "draw";
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
  winners: (DrawPerson & { position: number; prize: string })[];
  /** In order. If a winner cannot be reached, the next name here takes the
   *  prize — no second drawing, and no new randomness. */
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
