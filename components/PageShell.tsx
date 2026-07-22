"use client";

import { useEffect, useState } from "react";
import {
  Header,
  Hero,
  SoldProofStrip,
  HowItWorks,
  Closer,
} from "./LpSections";
import { CTA_COPY, readVariantFromCookie, type CtaVariant } from "@/lib/ctaVariant";
import type { CampaignMarket } from "@/lib/campaignMarkets";

export default function PageShell({
  market,
  crmMarketName = null,
  showPicker = false,
  neutral = false,
}: {
  market: CampaignMarket;
  crmMarketName?: string | null;
  /** Auto-open the market chooser on mount (used when geo resolves to "none"). */
  showPicker?: boolean;
  /** Brand-neutral backdrop: no market name anywhere, no sold-proof strip. */
  neutral?: boolean;
}) {
  // A/B variant, bucketed on the curbio_vid middleware cookie. Computed
  // client-side because this shell renders on prerendered pages — one HTML
  // for every visitor. SSR emits the control copy; both variants currently
  // share identical copy, so nothing flashes (see lib/ctaVariant.ts).
  const [variant, setVariant] = useState<CtaVariant>("control");
  useEffect(() => {
    setVariant(readVariantFromCookie());
  }, []);
  const ctaCopy = CTA_COPY[variant];

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
        />
        {!neutral && <SoldProofStrip market={market} />}
        <HowItWorks />
        <Closer ctaCopy={ctaCopy} marketSlug={market.slug} />
      </main>
    </>
  );
}
