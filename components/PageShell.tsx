"use client";

import {
  Header,
  Hero,
  SoldProofStrip,
  HowItWorks,
  Closer,
  StickyBar,
  Footer,
} from "./LpSections";
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
  return (
    <>
      <Header market={market} />
      <main>
        <Hero market={market} variant={variant} ctaCopy={ctaCopy} />
        <SoldProofStrip market={market} />
        <HowItWorks />
        <Closer ctaCopy={ctaCopy} />
      </main>
      <Footer />
      <StickyBar ctaCopy={ctaCopy} />
    </>
  );
}
