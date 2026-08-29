// ─────────────────────────────────────────────────────────────────────────────
// MARKET ROLLUP MAP — how app.curbio.com market codes aggregate for reporting.
//
// The market config (config/markets.ts) is the source of truth for which
// markets EXIST; this file is the source of truth for how the app's CRM codes
// ROLL UP into reporting rows, and which rolled-up markets are active. It
// lives in config, not components — no chart or table may re-derive this.
//
//   SMD, NMD, BAL → MD   One Maryland territory (spec §6a). The CRM's code
//                        stays BAL and means all of Maryland; the app splits
//                        it into three codes we do not report separately.
//   SD → closed          San Diego is closed. Its history imports and shows
//                        in trends, but it is EXCLUDED from pace/targets and
//                        active-market counts. History is not deleted to make
//                        a report add up.
//   Everything else 1:1.
// ─────────────────────────────────────────────────────────────────────────────

/** Reporting market: rollup code, display label, and whether the market is
 *  active (counts toward pace, targets, and the active-market denominator). */
export type ReportingMarket = {
  /** Rollup code used across the dashboard ("MD", "ATL"…). */
  code: string;
  label: string;
  /** false → closed: history renders in trends, excluded from pace/targets
   *  and active-market counts. */
  active: boolean;
};

export const REPORTING_MARKETS: ReportingMarket[] = [
  { code: "ATL", label: "Atlanta", active: true },
  { code: "DC", label: "Washington, DC", active: true },
  { code: "DAL", label: "Dallas", active: true },
  { code: "MD", label: "Maryland", active: true },
  { code: "LA", label: "Los Angeles", active: true },
  { code: "NVA", label: "Northern Virginia", active: true },
  { code: "RS", label: "Riverside", active: true },
  { code: "SEA", label: "Seattle", active: true },
  { code: "SD", label: "San Diego", active: false }, // closed — trends only
];

export const REPORTING_MARKET_BY_CODE: Record<string, ReportingMarket> =
  Object.fromEntries(REPORTING_MARKETS.map((m) => [m.code, m]));

/** app.curbio.com market code → reporting rollup code. */
export const APP_CODE_TO_REPORTING: Record<string, string> = {
  ATL: "ATL",
  DC: "DC",
  DAL: "DAL",
  BAL: "MD",
  NMD: "MD",
  SMD: "MD",
  LA: "LA",
  NVA: "NVA",
  RS: "RS",
  SEA: "SEA",
  SD: "SD",
};

/** Roll an app market code up to its reporting market. Null for a code this
 *  map has never seen — callers surface that, they never invent a market. */
export function reportingMarketForAppCode(appCode: string | null | undefined): ReportingMarket | null {
  const code = APP_CODE_TO_REPORTING[(appCode ?? "").trim().toUpperCase()];
  return code ? REPORTING_MARKET_BY_CODE[code] : null;
}

/** The active-market denominator for pace and target math. */
export const ACTIVE_REPORTING_MARKETS: ReportingMarket[] = REPORTING_MARKETS.filter(
  (m) => m.active
);
