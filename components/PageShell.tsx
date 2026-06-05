"use client";

import { useState } from "react";
import {
  Header,
  Hero,
  SoldProofStrip,
  HowItWorks,
  Closer,
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
      <ZipModal open={zipOpen} onClose={() => setZipOpen(false)} current={market} />
    </>
  );
}
