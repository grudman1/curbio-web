"use client";

import CampaignShell from "./CampaignShell";
import WaitlistShell from "../WaitlistShell";
import PageSkeleton from "../PageSkeleton";
import ExpPageSkeleton from "../ExpPageSkeleton";
import { useMarketResolution } from "../useMarketResolution";
import { getCampaignMarket, NEUTRAL_MARKET } from "@/lib/campaignMarkets";
import type { CampaignPage } from "@/config/campaigns/types";

// Client-side market resolution over the prerendered skeleton — the generic
// replacement for HomeClient/ExpHomeClient, which were identical apart from
// which shell and skeleton they named.
//
// The skeleton IS the prerendered HTML and therefore the first paint, so
// swapping in the resolved shell causes no layout shift. See
// components/useMarketResolution.ts for the resolution rules — in particular
// that an unrecognised market NEVER falls back to IP geo.
export default function CampaignClient({ page }: { page: CampaignPage }) {
  const res = useMarketResolution();

  // Partner pages have a taller hero (the co-brand lockup), so they get the
  // matching skeleton. Purely a layout-stability concern.
  const Skeleton = page.partner ? ExpPageSkeleton : PageSkeleton;

  if (!res) return <Skeleton />;

  if (res.view === "waitlist") {
    return <WaitlistShell outZip={res.outZip} geoCity={res.geoCity} geoRegion={res.geoRegion} />;
  }

  if (res.view === "market") {
    return (
      <CampaignShell
        page={page}
        market={getCampaignMarket(res.slug)}
        crmMarketName={res.crmMarketName}
      />
    );
  }

  return (
    <CampaignShell
      page={page}
      market={NEUTRAL_MARKET}
      crmMarketName={null}
      neutral
      // Only auto-open the picker on pages that have one.
      showPicker={page.market.mode === "picker"}
    />
  );
}
