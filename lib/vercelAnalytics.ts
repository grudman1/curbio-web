// ─────────────────────────────────────────────────────────────────────────────
// Vercel Web Analytics read client.
//
// VERIFIED AGAINST THE LIVE API 2026-08-25. Two traps, both of which return
// 200 and look like success:
//
//   1. The date params are `since` / `until`. `from` / `to` are SILENTLY
//      IGNORED and the API answers with its own default window (all time).
//   2. The grouping param is `by`. `groupBy` is SILENTLY IGNORED and the API
//      answers with ungrouped totals.
//
// Both were hit during this build. A wrong param here does not fail — it
// returns a plausible number for the wrong window, which is exactly the kind
// of quiet wrongness the rest of this codebase is built to avoid. Hence this
// module: nothing else constructs these query strings.
//
// BUCKET CAPS. `visits/aggregate` limits BUCKET COUNT, not date range and not
// plan retention. Over the cap it is a 400 `invalid_group_by`, not a truncated
// result:
//     hour  168 buckets   (~7 days)
//     day    62 buckets   (~2 months)
//     week   26 buckets   (~6 months)
//     month  13+ buckets  (12 months+)
// So 90d CANNOT render daily points. app/(site)/admin/_ui/timeframe.ts owns
// that mapping (bucketFor) and is the only thing that should choose a bucket.
//
// `visits/count` has no window cap at all — a full year returns fine.
//
// READ-ONLY. This client has no write surface; the token is scoped to reads.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://api.vercel.com/v1/query/web-analytics";

/** How long an upstream analytics read is reused. Traffic numbers do not need
 *  to be fresher than the time it takes to read them, and the Vercel API is
 *  rate limited. This was the route handler's `revalidate` until the route
 *  became authenticated — see the fetch comments below. */
export const ANALYTICS_TTL_S = 900;

export type Bucket = "hour" | "day" | "week" | "month";

/** One (timestamp × route) row as the aggregate endpoint returns it. */
export type AggregateRow = {
  timestamp: string;
  route: string;
  visitors: number;
  pageviews: number;
};

export type AnalyticsResult =
  | { configured: false }
  | { configured: true; rows: AggregateRow[]; error: null }
  | { configured: true; rows: []; error: string };

function credentials(): { token: string; teamId: string; projectId: string } | null {
  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  return token && teamId && projectId ? { token, teamId, projectId } : null;
}

/**
 * Traffic by route over time — the whole Pages table in ONE request.
 *
 * `by=day&by=route` is supported (two grouping dimensions), which is why there
 * is no per-path fan-out and no per-card fetch: ~1,400 rows / 47 routes / 30
 * days arrives in a single ~134 KB response.
 *
 * `route` is the FRAMEWORK PATTERN (`/lp/[campaign]/m/[market]`), so all eight
 * market variants roll into one row — which is what a registry card wants. A
 * per-market breakdown needs `requestPath` instead; that is a different
 * question and deliberately a different call.
 */
export async function routeTraffic(
  since: string,
  until: string,
  bucket: Bucket,
  limit = 100
): Promise<AnalyticsResult> {
  const creds = credentials();
  if (!creds) return { configured: false };

  const params = new URLSearchParams({
    teamId: creds.teamId,
    projectId: creds.projectId,
    since,
    until,
    limit: String(limit),
    environment: "production",
  });
  // `by` repeats for each dimension. Order matters to the response shape but
  // not to correctness.
  params.append("by", bucket);
  params.append("by", "route");

  try {
    const res = await fetch(`${BASE}/visits/aggregate?${params}`, {
      headers: { Authorization: `Bearer ${creds.token}` },
      // Caching lives HERE, not on the route handler, because the route is
      // authenticated and its RESPONSE must never be cached (see
      // app/api/admin/page-stats/route.ts). This upstream request is keyed
      // entirely by project + timeframe + dimensions — identical for every
      // admin, carrying nothing user-specific — so the data cache is shared
      // safely and the rate-limited Vercel API is still protected.
      next: { revalidate: ANALYTICS_TTL_S },
    });

    if (!res.ok) {
      const body = await res.text();
      // Surface the API's own message. `invalid_group_by` means a bucket cap
      // was exceeded and is a BUG in bucketFor(), not a transient failure.
      return { configured: true, rows: [], error: `Vercel ${res.status}: ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as { data?: AggregateRow[] };
    return { configured: true, rows: json.data ?? [], error: null };
  } catch (err) {
    // A broken analytics read must never render as "this page got no traffic".
    return { configured: true, rows: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/** Totals for one exact path, no bucketing. Uses `visits/count`, which has no
 *  window cap — the honest choice for long timeframes. The OData filter is the
 *  documented form; `requestPath` is the exact path, not the route pattern. */
export async function pathTotals(
  path: string,
  since: string,
  until: string
): Promise<{ visitors: number; pageviews: number } | null> {
  const creds = credentials();
  if (!creds) return null;

  const params = new URLSearchParams({
    teamId: creds.teamId,
    projectId: creds.projectId,
    since,
    until,
    filter: `requestPath eq '${path.replace(/'/g, "''")}'`,
    environment: "production",
  });

  try {
    const res = await fetch(`${BASE}/visits/count?${params}`, {
      headers: { Authorization: `Bearer ${creds.token}` },
      // Same reasoning as visits/aggregate above.
      next: { revalidate: ANALYTICS_TTL_S },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { visitors: number; pageviews: number } };
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ── Registry path → analytics route ──────────────────────────────────────────

/**
 * The registry writes dynamic segments as `:market`; Vercel reports them as
 * Next's `[market]`. Normalising both to a single form is what lets a card
 * find its own traffic.
 *
 * Historical note that matters in practice: the route list still contains
 * pre-301 `/admin/marketing/*` paths from before the Hub moved out of the
 * Control Room. Those are real past hits, not errors — they simply match no
 * current registry entry and fall out. Do not "fix" them by remapping; the
 * traffic happened at that URL.
 */
export function normalizeRoute(p: string): string {
  return p.replace(/:([A-Za-z_]+)/g, "[$1]").replace(/\/+$/, "") || "/";
}
