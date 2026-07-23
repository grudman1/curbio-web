// Live integration with Curbio's own operator-routing service. This is the
// source of truth for which Home Services Manager (HSM) serves a given zip,
// whether the zip is in-market, and whether it's currently business hours.
// It supersedes any static zip→market table — assignments stay current
// automatically.

const ENDPOINT =
  process.env.CURBIO_OPERATOR_API ??
  "https://app.curbio.com/api/Operator/GetOperatorLead";

export type OperatorLead = {
  isOutOfMarket: boolean;
  isBusinessHours: boolean;
  marketName: string | null;
  pmName: string | null;
  pmPhone: string | null;
  pmCalendlyUrl: string | null;
  isPoc: boolean;
};

async function fetchOperatorLead(code: string): Promise<OperatorLead | null> {
  // 800ms budget: a slow third-party API must never cost more than this on
  // any path that can face a visitor. Every caller has an acceptable static
  // fallback (buildResolvedMarketFromSlug / neutral), and the 120s data cache
  // means most calls never leave the data cache anyway.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 800);

  try {
    const res = await fetch(`${ENDPOINT}?code=${code}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<OperatorLead>;
    if (typeof data?.isOutOfMarket !== "boolean") return null;
    return {
      isOutOfMarket: data.isOutOfMarket,
      isBusinessHours: Boolean(data.isBusinessHours),
      marketName: data.marketName ?? null,
      pmName: data.pmName ?? null,
      pmPhone: data.pmPhone ?? null,
      pmCalendlyUrl: data.pmCalendlyUrl ?? null,
      isPoc: Boolean(data.isPoc),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolve a 5-digit zip to its Curbio operator lead. Server-side only.
 *
 * Returns `null` on any failure (bad zip, timeout, network error, non-200, or
 * malformed body) so callers fall through to the neutral "find your local team"
 * state — we never want to render a wrong HSM during detection.
 *
 * Successful responses are cached for 5 minutes per zip (data cache) to keep
 * API load low while keeping the time-sensitive `isBusinessHours` flag fresh.
 *
 * OUTER hard timeout, independent of the AbortController inside
 * fetchOperatorLead(): during `next build`, /m/[market] and /exp/m/[market]
 * both resolve the same market slug to the same canonical zip and so issue
 * the identical operator-API fetch concurrently — Next.js's build-time fetch
 * deduplication then shares one underlying request across both page workers.
 * Observed in production (2026-07-23): that shared request hung well past its
 * own 800ms AbortController for one consumer (/exp/m/atlanta), stalling page
 * generation for 60s × 3 retries and failing the entire deploy — while a
 * *different* concurrent build of the exact same code succeeded, pointing at
 * a timing-dependent interaction with Next's dedup/cache layer rather than a
 * bug in the abort logic itself (which is correct and unremarkable in
 * isolation). Root-caused to Next's internals with reasonable confidence, not
 * certainty — this wrapper makes the exact mechanism moot: no matter what
 * happens inside fetchOperatorLead(), this function guarantees a return
 * within HARD_TIMEOUT_MS. A build-time hang here can never happen again,
 * regardless of the underlying cause.
 */
const HARD_TIMEOUT_MS = 3000;

export async function getOperatorLead(
  zip: string | null | undefined
): Promise<OperatorLead | null> {
  const code = (zip ?? "").replace(/\D/g, "").slice(0, 5);
  if (code.length !== 5) return null;

  return Promise.race([
    fetchOperatorLead(code),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), HARD_TIMEOUT_MS)),
  ]);
}
