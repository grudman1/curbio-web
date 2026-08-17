import { Redis } from "@upstash/redis";

// ─────────────────────────────────────────────────────────────────────────────
// Wins / Concerns / Decisions — the Executive page's written agenda, one
// record per month, in Redis (marketing:execnotes:v1, field = "2026-08").
// Reads use the READ-ONLY token; the write happens only in the session-
// checked server action. The share route renders these read-only — which is
// the whole reason they persist server-side instead of living in a textarea.
// ─────────────────────────────────────────────────────────────────────────────

const NOTES_KEY = "marketing:execnotes:v1";

export type ExecNotes = {
  wins: string;
  concerns: string;
  decisions: string;
  /** ISO timestamp of the last save. */
  updatedAt: string;
};

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

export async function readExecNotes(month: string): Promise<ExecNotes | null> {
  const redis = readOnlyRedis();
  if (!redis) return null;
  try {
    const v = await redis.hget<ExecNotes | string>(NOTES_KEY, month);
    if (!v) return null;
    return typeof v === "string" ? (JSON.parse(v) as ExecNotes) : v;
  } catch {
    return null;
  }
}

/** Write path — the session-checked server action only. */
export async function writeExecNotes(month: string, notes: ExecNotes): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("notes store not configured");
  await redis.hset(NOTES_KEY, { [month]: JSON.stringify(notes) });
}
