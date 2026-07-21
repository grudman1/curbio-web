"use client";

import ExpShell from "./ExpShell";
import WaitlistShell from "./WaitlistShell";
import ExpPageSkeleton from "./ExpPageSkeleton";
import { useMarketResolution } from "./useMarketResolution";
import { getCampaignMarket, NEUTRAL_MARKET } from "@/lib/campaignMarkets";

// Prerendered-/exp rendering over client-side market resolution — the /exp
// twin of HomeClient; see components/useMarketResolution.ts for the rules.
export default function ExpHomeClient() {
  const res = useMarketResolution();

  if (!res) return <ExpPageSkeleton />;

  if (res.view === "waitlist") {
    return <WaitlistShell outZip={res.outZip} geoCity={res.geoCity} geoRegion={res.geoRegion} />;
  }

  if (res.view === "market") {
    return <ExpShell market={getCampaignMarket(res.slug)} crmMarketName={res.crmMarketName} />;
  }

  return <ExpShell market={NEUTRAL_MARKET} crmMarketName={null} neutral showPicker />;
}
