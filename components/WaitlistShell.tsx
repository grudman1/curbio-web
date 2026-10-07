"use client";

import { useState } from "react";
import { Header, WaitlistPage } from "./LpSections";
import { ZipModal } from "./LpModals";
import { PartnerHeader } from "./campaign/PartnerHeader";
import { NEUTRAL_MARKET } from "@/lib/campaignMarkets";
import { PARTNERS } from "@/lib/partners";
import { useCampaignBase, useMarketBase } from "@/lib/campaignBase";
import type { CampaignPage } from "@/config/campaigns/types";

// The out-of-area waitlist view of a campaign page.
//
// It is the SAME page the visitor came from, so it keeps that page's chrome:
// the header reads "Choose your market" (an out-of-area visitor has no market —
// it used to show the default market, Atlanta), a partner page keeps its
// co-branded header, and every market link stays on the page's own mount
// (/exp stays /exp — it used to drop the visitor on the generic homepage).
export default function WaitlistShell({
  page,
  outZip,
  geoCity,
  geoRegion,
}: {
  page: CampaignPage;
  outZip?: string;
  geoCity?: string;
  geoRegion?: string;
}) {
  const [zipOpen, setZipOpen] = useState(false);
  const base = useCampaignBase();
  const marketBase = useMarketBase();
  const partnerId = page.partner;
  const partner = partnerId ? PARTNERS[partnerId] : undefined;

  return (
    <>
      {partnerId ? (
        <PartnerHeader
          partnerId={partnerId}
          market={NEUTRAL_MARKET}
          neutral
          initialPickerOpen={false}
          basePath={marketBase}
        />
      ) : (
        <Header market={NEUTRAL_MARKET} neutral logoHref={base} basePath={marketBase} />
      )}
      <main>
        <WaitlistPage
          zip={outZip ?? ""}
          geoCity={geoCity}
          geoRegion={geoRegion}
          onChooseMarket={() => setZipOpen(true)}
          // Same referral the page's own form sends — "eXp realty" on eXp
          // pages, nothing (the route's default) on owned pages.
          referralSourceId={page.attribution.referralSourceId ?? partner?.referralSourceId}
          waitlistFrom={page.attribution.source.replace(/\{marketSlug\}/g, "unknown")}
        />
      </main>
      <ZipModal open={zipOpen} onClose={() => setZipOpen(false)} current={null} basePath={marketBase} />
    </>
  );
}
