import {
  MARKET_SOURCE_LABEL,
  MARKET_SOURCE_STRENGTH,
  type MarketSourceRead,
} from "@/lib/marketSignals";
import type { FeedDetailSection } from "./LeadFeedTable";

// The MARKET SOURCE block on an expanded record.
//
// Two requirements, both load-bearing:
//
//   1. Say WHICH SIGNAL WON — not merely that a market was determined. A ZIP
//      the visitor typed and a market inherited from a campaign name are not
//      the same evidence, and a record showing only the outcome hides which
//      one it was.
//
//   2. When signals DISAGREED, show both. A campaign naming Atlanta on a lead
//      whose market is Seattle is the case that stays invisible otherwise, and
//      a silent winner is how bad attribution survives.
//
// For leads written before `marketSource` was persisted the deciding signal is
// genuinely unrecoverable — resolveMarket() computed it at render and threw it
// away. This renders `unknown` rather than inferring one, because a fabricated
// provenance is worse than an absent one. The DISAGREEMENT half still works
// retroactively, which is the half that catches real problems.

const SIGNAL_LABEL: Record<string, string> = {
  zip: "ZIP on the record",
  campaign: "Campaign",
  geo: "IP geolocation",
};

export function marketSourceSection(ms: MarketSourceRead): FeedDetailSection {
  const fields: FeedDetailSection["fields"] = [
    { label: "Market", value: ms.market ?? "—" },
    {
      label: "Decided by",
      value: ms.recorded
        ? `${MARKET_SOURCE_LABEL[ms.decidedBy]} · ${MARKET_SOURCE_STRENGTH[ms.decidedBy]} signal`
        : "unknown — not recorded when this lead was written",
      highlight: ms.recorded ? undefined : "warn",
    },
  ];

  for (const s of ms.signals) {
    fields.push({
      label: SIGNAL_LABEL[s.kind] ?? s.kind,
      value:
        s.value +
        (s.impliedMarket ? ` → implies ${s.impliedMarket}` : "") +
        (s.disagrees ? "  ⚠ disagrees with the market on the record" : ""),
      highlight: s.disagrees ? "fail" : undefined,
    });
  }

  if (ms.signals.length === 0) {
    fields.push({
      label: "Signals present",
      value: "none on the record — no ZIP, no campaign, no detected location",
      highlight: "warn",
    });
  }

  return { title: ms.conflict ? "Market source — signals disagree" : "Market source", fields };
}
