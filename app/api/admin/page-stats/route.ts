import { NextResponse } from "next/server";
import { requireAdminApiSession, unauthorized } from "@/lib/adminApiAuth";
import { buildPageRegistry } from "@/config/pageRegistry";
import { computePageStats } from "@/lib/pageStats";
import { bucketFor, dayRange, monthsFor, parseTimeframe } from "@/app/(site)/admin/_ui/timeframe";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";

// ─────────────────────────────────────────────────────────────────────────────
// ONE cached route for every page's stats, keyed by timeframe.
//
// Never called per card. `by=day&by=route` returns every route's traffic in a
// single upstream request (see lib/vercelAnalytics.ts), so a Pages screen with
// 30 cards costs one Vercel call, not 30.
//
// The preview iframes on the Pages screen are sandboxed WITHOUT allow-scripts
// and are NEVER a data source — every number on a card comes from here. That
// is what keeps a preview from being able to fire analytics at the page it is
// previewing.
//
// GATES ITSELF. middleware.ts's matcher excludes /api (the leading `api` in
// its negative lookahead), so the /admin session gate that covers every admin
// PAGE never runs here. This route previously claimed the opposite in this
// comment and was reachable unauthenticated, serving per-page traffic for the
// whole registry to anyone who knew the URL. See lib/adminApiAuth.ts.
// ─────────────────────────────────────────────────────────────────────────────

// DYNAMIC, and it must stay that way. This route reads the session cookie, so
// neither the Next route cache nor a CDN may hold its response — an
// authenticated payload sitting in a shared cache is the same leak the missing
// gate was, one layer further out. The ~15-minute reuse that used to live here
// as `revalidate` now lives on the upstream fetches in lib/vercelAnalytics.ts
// (ANALYTICS_TTL_S), where it still shields the rate-limited Vercel API but
// caches only the traffic data — which is identical for every admin — instead
// of an authenticated HTTP response.
export const dynamic = "force-dynamic";

/** How many recent leads the conversion denominator scans. Matches SCAN in the
 *  admin UI so the two never disagree about what window they cover. */
const SCAN = 500;

export async function GET(req: Request) {
  if (!(await requireAdminApiSession())) return unauthorized();

  const url = new URL(req.url);
  // Day-grain default: this route only ever serves day-grain screens (Pages),
  // so an absent ?t= means 30d, not the latest snapshot month.
  const tf = parseTimeframe(url.searchParams.get("t") ?? undefined, SNAPSHOT_MONTHS, "day");

  // Day kinds carry their own range; month kinds resolve through the snapshot's
  // months so the window can never name a month with no data.
  const range = dayRange(tf);
  let since: string;
  let until: string;
  if (range) {
    ({ since, until } = range);
  } else {
    const months = monthsFor(tf, SNAPSHOT_MONTHS);
    if (months.length === 0) {
      return NextResponse.json({ error: "timeframe resolves to no months with data" }, { status: 400 });
    }
    since = `${months[0]}-01`;
    until = new Date().toISOString().slice(0, 10);
  }

  const paths = buildPageRegistry()
    .filter((e) => e.status !== "planned") // a planned page has no traffic by definition
    .map((e) => e.path);

  const result = await computePageStats(paths, since, until, bucketFor(tf), SCAN);

  // no-store, not `private, s-maxage=...`: those two directives disagree about
  // whether a shared cache may store this, and the response is authenticated.
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
