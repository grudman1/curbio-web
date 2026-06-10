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
  showPicker = false,
  prefillName = "",
  prefillEmail = "",
}: {
  market: CampaignMarket;
  variant: CtaVariant;
  ctaCopy: string;
  /** Auto-open the market chooser on mount (used when geo resolves to "none"). */
  showPicker?: boolean;
  prefillName?: string;
  prefillEmail?: string;
}) {
  const [zipOpen, setZipOpen] = useState(showPicker);

  return (
    <>
      <Header market={market} onPickerClick={() => setZipOpen(true)} />
      <main>
        <Hero market={market} variant={variant} ctaCopy={ctaCopy} prefillName={prefillName} prefillEmail={prefillEmail} />
        <SoldProofStrip market={market} />
        <HowItWorks />
        <Closer ctaCopy={ctaCopy} />
      </main>
      <ZipModal open={zipOpen} onClose={() => setZipOpen(false)} current={market} />
    </>
  );
}
