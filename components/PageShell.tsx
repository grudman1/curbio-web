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
  neutral = false,
  prefillName = "",
  prefillEmail = "",
}: {
  market: CampaignMarket;
  variant: CtaVariant;
  ctaCopy: string;
  /** Auto-open the market chooser on mount (used when geo resolves to "none"). */
  showPicker?: boolean;
  /** Brand-neutral backdrop: no market name anywhere, no sold-proof strip. */
  neutral?: boolean;
  prefillName?: string;
  prefillEmail?: string;
}) {
  const [zipOpen, setZipOpen] = useState(showPicker);

  return (
    <>
      <Header market={market} neutral={neutral} onPickerClick={() => setZipOpen(true)} />
      <main>
        <Hero market={market} neutral={neutral} variant={variant} ctaCopy={ctaCopy} prefillName={prefillName} prefillEmail={prefillEmail} />
        {!neutral && <SoldProofStrip market={market} />}
        <HowItWorks />
        <Closer ctaCopy={ctaCopy} />
      </main>
      <ZipModal open={zipOpen} onClose={() => setZipOpen(false)} current={neutral ? null : market} />
    </>
  );
}
