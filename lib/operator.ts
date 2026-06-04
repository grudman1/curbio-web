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

/**
 * Resolve a 5-digit zip to its Curbio operator lead. Server-side only.
 *
 * Returns `null` on any failure (bad zip, timeout, network error, non-200, or
 * malformed body) so callers fall through to the neutral "find your local team"
 * state — we never want to render a wrong HSM during detection.
 *
 * Successful responses are cached for 5 minutes per zip (data cache) to keep
 * API load low while keeping the time-sensitive `isBusinessHours` flag fresh.
 */
export async function getOperatorLead(
  zip: string | null | undefined
): Promise<OperatorLead | null> {
  const code = (zip ?? "").replace(/\D/g, "").slice(0, 5);
  if (code.length !== 5) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${ENDPOINT}?code=${code}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 300 },
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
