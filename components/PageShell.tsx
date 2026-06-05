"use client";

import { useState } from "react";
import {
  Header,
  Hero,
  SoldProofStrip,
  HowItWorks,
  Closer,
  StickyBar,
} from "./LpSections";
import { ZipModal } from "./LpModals";
import type { CtaVariant } from "@/lib/flags";
import type { CampaignMarket } from "@/lib/campaignMarkets";

export default function PageShell({
  market,
  variant,
  ctaCopy,
}: {
  market: CampaignMarket;
  variant: CtaVariant;
  ctaCopy: string;
}) {
  const [zipOpen, setZipOpen] = useState(false);

  return (
    <>
      <Header market={market} onPickerClick={() => setZipOpen(true)} />
      <main>
        <Hero market={market} variant={variant} ctaCopy={ctaCopy} />
        <SoldProofStrip market={market} />
        <HowItWorks />
        <Closer ctaCopy={ctaCopy} />
      </main>
      {/* Page ends cleanly after the Closer — no footer section */}
      <StickyBar ctaCopy={ctaCopy} />
      <ZipModal open={zipOpen} onClose={() => setZipOpen(false)} current={market} />
    </>
  );
}
