// ─────────────────────────────────────────────────────────────────────────────
// EMAIL LIST HEALTH — lifetime engagement per Mailchimp market audience.
//
// Transcribed from data/imports/mailchimp-audience-summary.csv (exported
// 2026-08-29, committed verbatim beside this file). This is NOT attribution —
// it never joins to leads, channels, or Qualified counts. It is the Email
// channel page's "List health by market" table, nothing else.
//
// Open rates are MPP-excluded (Apple Mail Privacy Protection opens removed),
// so they understate rather than flatter.
//
// Seattle and Riverside have NO Mailchimp audience — they are ABSENT from
// this list, not zero. A market missing here renders as "no audience", never
// as 0%.
// ─────────────────────────────────────────────────────────────────────────────

export type AudienceHealth = {
  /** Mailchimp audience name, verbatim. */
  audience: string;
  /** Reporting market code (config/market-map.ts) this audience serves. */
  reportingMarket: string;
  emailsSent: number;
  /** Rates as fractions (0.983 = 98.3%), straight from the export. */
  deliveryRate: number;
  /** MPP-excluded. */
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
};

export const EMAIL_LIST_HEALTH_AS_OF = "2026-08-29";

export const EMAIL_LIST_HEALTH: AudienceHealth[] = [
  { audience: "ATLANTA",     reportingMarket: "ATL", emailsSent: 157_618, deliveryRate: 0.983, openRate: 0.448, clickRate: 0.027,  unsubscribeRate: 0.0048 },
  { audience: "DALLAS",      reportingMarket: "DAL", emailsSent: 93_415,  deliveryRate: 0.975, openRate: 0.457, clickRate: 0.011,  unsubscribeRate: 0.0037 },
  { audience: "DC",          reportingMarket: "DC",  emailsSent: 27_725,  deliveryRate: 0.987, openRate: 0.501, clickRate: 0.0042, unsubscribeRate: 0.0052 },
  { audience: "LOS ANGELES", reportingMarket: "LA",  emailsSent: 162_872, deliveryRate: 0.981, openRate: 0.39,  clickRate: 0.028,  unsubscribeRate: 0.0064 },
  { audience: "MARYLAND",    reportingMarket: "MD",  emailsSent: 147_457, deliveryRate: 0.992, openRate: 0.316, clickRate: 0.004,  unsubscribeRate: 0.0084 },
  { audience: "NOVA",        reportingMarket: "NVA", emailsSent: 91_834,  deliveryRate: 0.982, openRate: 0.357, clickRate: 0.0068, unsubscribeRate: 0.0037 },
];
