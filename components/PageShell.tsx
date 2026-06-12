"use client";

import {
  Header,
  Hero,
  SoldProofStrip,
  HowItWorks,
  Closer,
} from "./LpSections";
import type { CtaVariant } from "@/lib/flags";
import type { CampaignMarket } from "@/lib/campaignMarkets";

export default function PageShell({
  market,
  crmMarketName = null,
  variant,
  ctaCopy,
  showPicker = false,
  neutral = false,
  prefillName = "",
  prefillEmail = "",
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  variant: CtaVariant;
  ctaCopy: string;
  /** Auto-open the market chooser on mount (used when geo resolves to "none"). */
  showPicker?: boolean;
  /** Brand-neutral backdrop: no market name anywhere, no sold-proof strip. */
  neutral?: boolean;
  prefillName?: string;
  prefillEmail?: string;
}) {
  return (
    <>
      <Header market={market} neutral={neutral} initialPickerOpen={showPicker} />
      <main>
        <Hero
          market={market}
          crmMarketName={crmMarketName}
          neutral={neutral}
          variant={variant}
          ctaCopy={ctaCopy}
          prefillName={prefillName}
          prefillEmail={prefillEmail}
        />
        {!neutral && <SoldProofStrip market={market} />}
        <HowItWorks />
        <Closer ctaCopy={ctaCopy} />
      </main>
    </>
  );
}
