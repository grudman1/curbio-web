import { cache } from "react";
import { Redis } from "@upstash/redis";

// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY reader for the waitlist store — same shape as lib/adminLeads.ts,
// deliberately kept SEPARATE rather than folded into it: waitlist entries
// never touch leads:v1 or leads:delivery:v1 (see app/api/lead/route.ts), so
// there is no delivery outcome to join here. This is a signup list, not a
// delivery-diagnostics feed.
//
// Uses the READ-ONLY Upstash token — same "no delete, no edit" guarantee as
// adminLeads.ts, enforced by the credential rather than convention.
// ─────────────────────────────────────────────────────────────────────────────

const WAITLIST_KEY = "waitlist:leads";

export type WaitlistEntry = {
  leadId?: string;
  name?: string;
  firstName?: string;
  email?: string;
  zip?: string;
  submittedAt?: string;
  detectedCity?: string;
  detectedRegion?: string;
  firstTouchChannel?: string | null;
  firstTouchCampaign?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

function getReadOnlyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  // READ-ONLY on purpose. Never swap this for the read-write token.
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export type WaitlistResult =
  | { configured: false }
  | { configured: true; entries: WaitlistEntry[]; total: number; error: string | null };

/** Newest `limit` waitlist signups.
 *
 *  Wrapped in React cache(): if both the tab and a future summary card read
 *  this in one request, they share the Redis hit rather than doubling it. */
export const readRecentWaitlist = cache(async (limit = 200): Promise<WaitlistResult> => {
  const redis = getReadOnlyRedis();
  if (!redis) return { configured: false };

  try {
    // Upstash decodes JSON strings automatically when they parse as JSON, so
    // entries arrive as objects here rather than strings. Handle both — same
    // defensive parse as adminLeads.ts.
    const [raw, total] = await Promise.all([
      redis.lrange<WaitlistEntry | string>(WAITLIST_KEY, 0, limit - 1),
      redis.llen(WAITLIST_KEY),
    ]);

    const parse = (v: WaitlistEntry | string): WaitlistEntry | null => {
      if (typeof v !== "string") return v;
      try {
        return JSON.parse(v) as WaitlistEntry;
      } catch {
        return null;
      }
    };

    const entries = (raw ?? []).map(parse).filter((e): e is WaitlistEntry => !!e);
    return { configured: true, entries, total: total ?? entries.length, error: null };
  } catch (err) {
    // A broken admin page must never look like "nobody is on the waitlist."
    return {
      configured: true,
      entries: [],
      total: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

// ── PII minimisation ─────────────────────────────────────────────────────────
// Same masking as lib/adminLeads.ts, applied for the same reason: this page
// diagnoses WHERE demand is, not who to call — unmasking is a deliberate
// change, not a default.

export function maskEmail(email: string | undefined): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return "—";
  const head = user.slice(0, 1);
  return `${head}${"•".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

export function maskName(entry: WaitlistEntry): string {
  const first = entry.firstName || (entry.name ?? "").trim().split(/\s+/)[0];
  return first ? `${first} ${"•".repeat(3)}` : "—";
}

// ── expansion-demand signal ──────────────────────────────────────────────────
// detectedRegion is x-vercel-ip-country-region (lib/resolveMarket.ts) — for US
// visitors that IS the two-letter state code, not a market we serve. Grouping
// by it is the whole point of this page: it's demand for markets that don't
// exist yet, so there is no config/markets.ts row to group by instead.
export function countsByState(entries: WaitlistEntry[]): { state: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const state = e.detectedRegion?.trim() || "Unknown";
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
}
