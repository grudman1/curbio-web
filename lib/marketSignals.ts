import { MARKETS } from "@/config/markets";
import type { StoredLead } from "./adminLeads";

// ─────────────────────────────────────────────────────────────────────────────
// MARKET SOURCE — which signal decided this lead's market, and what the other
// signals said.
//
// WHY IT MATTERS: the signals have very different strength. A ZIP the visitor
// typed is strong evidence. A market inherited from a campaign is weak — it
// says which list the email went to, not where the agent is. IP geo sits in
// between and is wrong often enough to matter. A record that shows only the
// OUTCOME hides which of those produced it.
//
// ── THE REAL RESOLUTION PATH (traced in lib/resolveMarket.ts) ────────────────
//
// resolveMarket() returns one of exactly five sources, and they are not the
// ones a reader would guess:
//
//   param         ?market=<slug> — the campaign link. Wins over everything,
//                 deliberately: the email link is the authoritative signal and
//                 a present ?market= suppresses geo entirely.
//   zip           ?zip= / ?code= the visitor typed. Never falls through to geo.
//   geo           Vercel IP headers, then nearest served market within 75 mi.
//   out-of-area   ZIP answered "not served" → the waitlist.
//   none          neutral; the market chooser is shown.
//
// Corrections to the guessed enum, worth stating because they change what the
// field can honestly claim:
//
//   • `campaign` and `url_param` are THE SAME SIGNAL. There is no path that
//     parses a campaign NAME for a market; the campaign sets ?market=<slug>
//     and that is `param`.
//   • `operator_api` is NOT a source. Every branch calls it to ENRICH the
//     match (HSM, CRM market name); none of them lets it decide. Attributing a
//     market to it would be wrong in all five cases.
//   • `manual` does not exist. The attribution spec lists rep-created leads as
//     a door that is NOT BUILT.
//
// ── THE PROBLEM WITH HISTORY ────────────────────────────────────────────────
//
// resolveMarket() computes `source` at page render and THROWS IT AWAY. The
// form posts `market` and never the reason. So for every lead already in the
// store the deciding signal is genuinely unrecoverable, and this module says
// `unknown` rather than guessing — a fabricated provenance is worse than none.
//
// What IS recoverable retroactively is the other half of the requirement:
// which signals were PRESENT and whether they DISAGREED. A campaign naming
// Atlanta on a lead whose market is Seattle is visible in the stored record,
// and that disagreement is exactly the thing that stays invisible otherwise.
// ─────────────────────────────────────────────────────────────────────────────

export type MarketSourceKind = "param" | "zip" | "geo" | "out-of-area" | "none" | "unknown";

export const MARKET_SOURCE_LABEL: Record<MarketSourceKind, string> = {
  param: "campaign link (?market=)",
  zip: "ZIP entered by visitor",
  geo: "IP geolocation",
  "out-of-area": "out of area — waitlist",
  none: "not resolved — chooser shown",
  unknown: "unknown",
};

/** How much weight the signal deserves. Rendered so a weak winner is visibly
 *  weak rather than quietly authoritative. */
export const MARKET_SOURCE_STRENGTH: Record<MarketSourceKind, "strong" | "medium" | "weak" | "none"> = {
  zip: "strong",
  param: "weak",
  geo: "medium",
  "out-of-area": "strong",
  none: "none",
  unknown: "none",
};

export type MarketSignal = {
  kind: "zip" | "campaign" | "geo";
  /** What this signal said, in words. */
  value: string;
  /** The market slug this signal points at, when it names one. */
  impliedMarket: string | null;
  /** True when this signal contradicts the market on the record. */
  disagrees: boolean;
};

export type MarketSourceRead = {
  /** The market actually on the record. */
  market: string | null;
  /** The deciding signal — `unknown` for every lead written before the field
   *  was persisted. Never inferred. */
  decidedBy: MarketSourceKind;
  /** True when `decidedBy` came off the record rather than being absent. */
  recorded: boolean;
  /** Every signal present on the record, deciding or not. */
  signals: MarketSignal[];
  /** True when at least one present signal points somewhere else. */
  conflict: boolean;
};

const SLUGS = MARKETS.map((m) => m.slug);

/** Find a market slug named inside a free-text string (a campaign name, say).
 *  Matches slug tokens and the display name's city token, both hyphen- and
 *  underscore-separated. Returns null rather than guessing on a near-miss. */
export function marketNamedIn(text: string | null | undefined): string | null {
  if (!text) return null;
  const hay = text.toLowerCase().replace(/[_\s]+/g, "-");
  // Longest slug first so "washington-dc" wins over a bare "washington".
  for (const slug of [...SLUGS].sort((a, b) => b.length - a.length)) {
    if (hay.includes(slug)) return slug;
  }
  for (const m of MARKETS) {
    const city = m.displayName.split(",")[0].trim().toLowerCase().replace(/\s+/g, "-");
    if (city.length >= 4 && hay.includes(city)) return m.slug;
  }
  return null;
}

/**
 * Read every market signal off a stored lead.
 *
 * Deliberately does NOT infer `decidedBy` from the signals. Two signals
 * agreeing does not prove which one the resolver used, and stamping a
 * plausible provenance onto a record that never carried one is the exact
 * failure this dashboard exists to avoid.
 */
export function readMarketSource(lead: StoredLead): MarketSourceRead {
  const market = lead.market ?? null;
  const signals: MarketSignal[] = [];

  // ZIP — present on the record. Strong IF it decided, which we cannot prove.
  if (lead.zip) {
    signals.push({
      kind: "zip",
      value: lead.zip,
      impliedMarket: null, // a ZIP→market lookup is the operator API's job, not ours offline
      disagrees: false,
    });
  }

  // Campaign — the weak signal, and the one that produces silent conflicts.
  const campaignText = lead.utm_campaign ?? lead.firstTouchCampaign ?? null;
  const campaignMarket = marketNamedIn(campaignText);
  if (campaignText) {
    signals.push({
      kind: "campaign",
      value: campaignText,
      impliedMarket: campaignMarket,
      disagrees: !!(campaignMarket && market && campaignMarket !== market),
    });
  }

  // Geo — the IP-derived city/state that was available at submit time.
  const geoText = [lead.detectedCity, lead.detectedRegion].filter(Boolean).join(", ");
  if (geoText) {
    const marketState = MARKETS.find((m) => m.slug === market)?.state ?? null;
    const geoState = (lead.detectedRegion ?? "").trim().toUpperCase();
    signals.push({
      kind: "geo",
      value: geoText,
      impliedMarket: null,
      disagrees: !!(marketState && geoState && geoState !== marketState.toUpperCase()),
    });
  }

  // `marketSource` is written by the lead route for leads submitted after the
  // field shipped. Absent on everything older, and absence is reported as
  // unknown rather than filled in.
  const recordedRaw = (lead as StoredLead & { marketSource?: string }).marketSource;
  const recorded =
    recordedRaw === "param" || recordedRaw === "zip" || recordedRaw === "geo" ||
    recordedRaw === "out-of-area" || recordedRaw === "none";

  return {
    market,
    decidedBy: recorded ? (recordedRaw as MarketSourceKind) : "unknown",
    recorded,
    signals,
    conflict: signals.some((s) => s.disagrees),
  };
}
