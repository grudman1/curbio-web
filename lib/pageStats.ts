// ─────────────────────────────────────────────────────────────────────────────
// Per-page traffic and conversion. Joins three sources, and is scrupulous
// about which number came from where.
//
//   views      Vercel Web Analytics (lib/vercelAnalytics.ts)
//   leads      Redis leads:v1, filtered by submittedAt and source path.
//              OUR OWN DATA and the truest denominator we have.
//   conversion leads ÷ views — derived, and only when BOTH exist.
//
// THE TRUNCATION RULE. leads:v1 is capped (LPUSH, 5,000 entries) and the admin
// reader scans the newest N. A long timeframe therefore SILENTLY runs out of
// leads before it runs out of days — the oldest part of the window has no data
// not because nothing happened, but because we cannot see it. Reporting that
// as a conversion rate would be a wrong number stated confidently.
//
// So: when the scan window does not cover the requested timeframe, the range
// is labelled PARTIAL and the conversion rate is withheld (null → DASH). A
// missing number is honest; a wrong one is not.
//
// TODO(rollup): a nightly job writing stats:daily:<path>:<date> → {views,
// leads} removes both the truncation problem and the API call. Deliberately
// not built in this pass — it is a cost and completeness optimisation now,
// not the only path to a trend, since by=day&by=route already returns one.
// ─────────────────────────────────────────────────────────────────────────────

import { readRecentLeads, type LeadRow } from "./adminLeads";
import { normalizeRoute, routeTraffic, type Bucket } from "./vercelAnalytics";

export type TrendPoint = { t: string; v: number };

export type PageStat = {
  /** Registry path, unchanged. */
  path: string;
  /** Vercel route pattern this matched, or null when it never received traffic. */
  route: string | null;
  views: number | null;
  visitors: number | null;
  leads: number | null;
  /** leads ÷ views. null when either side is unknown, the lead scan is
   *  truncated, OR the two sources disagree about scope (see `mismatch`).
   *  Never a zero standing in for unknown. */
  conversion: number | null;
  /** leads > views — impossible for a real conversion rate, so the join is
   *  wrong for this path rather than the number being interesting. Leads are
   *  keyed on the form's `source` field and views on the Vercel route
   *  pattern; a form posting a surface that is not the route it rendered on
   *  produces exactly this. Surfaced, not silently clamped. */
  mismatch: boolean;
  viewTrend: TrendPoint[];
  leadTrend: TrendPoint[];
};

export type PageStatsResult = {
  stats: Record<string, PageStat>;
  bucket: Bucket;
  since: string;
  until: string;
  /** True when leads:v1's scan window does not reach back to `since` — the
   *  lead counts (and every conversion rate) are then incomplete. */
  leadsTruncated: boolean;
  /** Oldest lead the scan actually saw, ISO date. null when none. */
  leadsOldest: string | null;
  /** Non-null when the analytics read failed. NOT the same as zero traffic. */
  analyticsError: string | null;
  analyticsConfigured: boolean;
};

/** Which registry path a lead came from. The lead store records the surface
 *  in `source`; entryPoint is the fallback for older rows. */
function leadPath(row: LeadRow): string | null {
  const raw = row.lead.source ?? row.lead.entryPoint ?? null;
  if (!raw) return null;
  return raw.startsWith("/") ? normalizeRoute(raw) : null;
}

function bucketKey(iso: string, bucket: Bucket): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  if (bucket === "month") return d.toISOString().slice(0, 7);
  if (bucket === "week") {
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - day); // week starts Sunday, matching Vercel
    return d.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * The equal-length window immediately before [since, until]. Used for the
 * delta on every tile.
 *
 * Returns null when the previous window would start before the project had
 * analytics at all — there is no comparison to make, and a delta against a
 * period that did not exist would read as a collapse in traffic.
 */
export function previousWindow(
  since: string,
  until: string,
  earliest = "2026-06-04"
): { since: string; until: string } | null {
  const s0 = Date.parse(`${since}T00:00:00Z`);
  const u0 = Date.parse(`${until}T00:00:00Z`);
  if (!Number.isFinite(s0) || !Number.isFinite(u0)) return null;
  const span = u0 - s0;
  if (span <= 0) return null;
  const prevSince = new Date(s0 - span);
  if (prevSince.getTime() < Date.parse(`${earliest}T00:00:00Z`)) return null;
  return {
    since: prevSince.toISOString().slice(0, 10),
    until: new Date(s0 - 864e5).toISOString().slice(0, 10),
  };
}

export async function computePageStats(
  paths: readonly string[],
  since: string,
  until: string,
  bucket: Bucket,
  scan: number
): Promise<PageStatsResult> {
  const [traffic, leads] = await Promise.all([
    routeTraffic(since, until, bucket),
    readRecentLeads(scan),
  ]);

  // ── views, by route ──
  const byRoute = new Map<string, { views: number; visitors: number; trend: Map<string, number> }>();
  if (traffic.configured && !traffic.error) {
    for (const row of traffic.rows) {
      const key = normalizeRoute(row.route);
      let e = byRoute.get(key);
      if (!e) byRoute.set(key, (e = { views: 0, visitors: 0, trend: new Map() }));
      e.views += row.pageviews;
      e.visitors += row.visitors;
      const t = row.timestamp.slice(0, 10);
      e.trend.set(t, (e.trend.get(t) ?? 0) + row.pageviews);
    }
  }

  // ── leads, by path, within the window ──
  const sinceMs = Date.parse(`${since}T00:00:00Z`);
  const untilMs = Date.parse(`${until}T23:59:59Z`);
  const rows = leads.configured && !leads.error ? leads.rows : [];

  let oldestSeen: number | null = null;
  const byPath = new Map<string, { count: number; trend: Map<string, number> }>();
  for (const row of rows) {
    const ts = Date.parse(row.lead.submittedAt ?? "");
    if (!Number.isFinite(ts)) continue;
    if (oldestSeen === null || ts < oldestSeen) oldestSeen = ts;
    if (ts < sinceMs || ts > untilMs) continue;
    const p = leadPath(row);
    if (!p) continue;
    let e = byPath.get(p);
    if (!e) byPath.set(p, (e = { count: 0, trend: new Map() }));
    e.count += 1;
    const k = bucketKey(new Date(ts).toISOString(), bucket);
    e.trend.set(k, (e.trend.get(k) ?? 0) + 1);
  }

  // TRUNCATION: the scan came back full AND its oldest entry is newer than the
  // window start — so leads older than that exist but were not read.
  const scanFull = rows.length >= scan;
  const leadsTruncated = scanFull && oldestSeen !== null && oldestSeen > sinceMs;

  const toTrend = (m: Map<string, number>): TrendPoint[] =>
    [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => ({ t, v }));

  const stats: Record<string, PageStat> = {};
  for (const path of paths) {
    const key = normalizeRoute(path);
    const t = byRoute.get(key);
    const l = byPath.get(key);

    const views = t ? t.views : traffic.configured && !traffic.error ? 0 : null;
    // Leads are only a real 0 when the store was readable. An unreadable store
    // must not render as "no leads".
    const leadCount = rows.length || (leads.configured && !leads.error) ? (l?.count ?? 0) : null;

    // A conversion rate above 100% is not a surprising result, it is a broken
    // join — so it is withheld and flagged, never rendered and never clamped
    // to a plausible-looking 100%.
    const mismatch = views !== null && leadCount !== null && views >= 0 && leadCount > views;

    stats[path] = {
      path,
      route: t ? key : null,
      views,
      visitors: t ? t.visitors : views === 0 ? 0 : null,
      leads: leadCount,
      conversion:
        views !== null && views > 0 && leadCount !== null && !leadsTruncated && !mismatch
          ? leadCount / views
          : null,
      mismatch,
      viewTrend: t ? toTrend(t.trend) : [],
      leadTrend: l ? toTrend(l.trend) : [],
    };
  }

  return {
    stats,
    bucket,
    since,
    until,
    leadsTruncated,
    leadsOldest: oldestSeen !== null ? new Date(oldestSeen).toISOString().slice(0, 10) : null,
    analyticsError: traffic.configured ? traffic.error : null,
    analyticsConfigured: traffic.configured,
  };
}
