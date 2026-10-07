import { CAMPAIGNS } from "@/config/campaigns";
import { exp } from "@/config/campaigns/exp";
import type { CampaignPage } from "@/config/campaigns/types";

// ─────────────────────────────────────────────────────────────────────────────
// Which lead sources come from a page with MARKET SELECTION (market.mode
// "picker" — /, /lp/*, /exp). On those pages a lead without a market must be
// settled by its ZIP before it may reach the CRM: a served ZIP routes, anything
// else goes to the waitlist. See the gate in app/api/lead/route.ts.
//
// Derived from the configs, not typed out, so a new picker page is covered the
// moment it exists. Pages WITHOUT market selection are deliberately outside
// this: /staging-design-dc (mode "none") routes by ZIP in the CRM and must stay
// unchanged, and /contact is not a template page at all.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = "{marketSlug}";

const PICKER_PAGES: CampaignPage[] = [...CAMPAIGNS, exp].filter((p) => p.market.mode === "picker");

// "exp-realty-{marketSlug}" → "exp-realty-". A source template without the
// token names one fixed source, which is matched exactly.
const TEMPLATES = PICKER_PAGES.map((p) => p.attribution.source).map((s) =>
  s.includes(TOKEN) ? { prefix: s.slice(0, s.indexOf(TOKEN)), exact: null } : { prefix: null, exact: s }
);

/** True when `source` was written by a page that has market selection. */
export function isPickerPageSource(source: string | null | undefined): boolean {
  const s = (source ?? "").trim();
  if (!s) return false;
  // FormCard's own fallback when a page passes no source.
  if (s.startsWith("email-campaign-")) return true;
  return TEMPLATES.some((t) => (t.exact ? s === t.exact : s.startsWith(t.prefix!)));
}

/**
 * Re-stamp a neutral source ("exp-realty-unknown") with the market the ZIP
 * settled on ("exp-realty-atlanta"), so reporting that groups by source sees
 * the market. Only the trailing "unknown" written by the neutral page is
 * replaced; anything else is returned untouched.
 */
export function withMarketSlug(source: string, slug: string): string {
  return source.endsWith("-unknown") ? `${source.slice(0, -"unknown".length)}${slug}` : source;
}
