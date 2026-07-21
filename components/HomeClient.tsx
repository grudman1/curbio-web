"use client";

import PageShell from "./PageShell";
import WaitlistShell from "./WaitlistShell";
import PageSkeleton from "./PageSkeleton";
import { useMarketResolution } from "./useMarketResolution";
import { getCampaignMarket, NEUTRAL_MARKET } from "@/lib/campaignMarkets";

// Prerendered-`/` rendering over client-side market resolution — see
// components/useMarketResolution.ts for the resolution rules. The skeleton
// (already the prerendered HTML) holds the exact layout while resolution is
// in flight, so swapping in the resolved shell causes no layout shift — the
// same swap streaming SSR performed.
export default function HomeClient() {
  const res = useMarketResolution();

  if (!res) return <PageSkeleton />;

  if (res.view === "waitlist") {
    return <WaitlistShell outZip={res.outZip} geoCity={res.geoCity} geoRegion={res.geoRegion} />;
  }

  if (res.view === "market") {
    return <PageShell market={getCampaignMarket(res.slug)} crmMarketName={res.crmMarketName} />;
  }

  return <PageShell market={NEUTRAL_MARKET} crmMarketName={null} neutral showPicker />;
}
