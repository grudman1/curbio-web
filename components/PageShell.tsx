"use client";

import {
  Header,
  Hero,
  SoldProofStrip,
  BeforeAfter,
  HowItWorks,
  Closer,
  StickyBar,
  Footer,
} from "./LpSections";
import type { CtaVariant } from "@/lib/flags";

export default function PageShell({
  variant,
  ctaCopy,
}: {
  variant: CtaVariant;
  ctaCopy: string;
}) {
  return (
    <>
      <Header />
      <main>
        <Hero variant={variant} ctaCopy={ctaCopy} />
        <SoldProofStrip />
        <BeforeAfter />
        <HowItWorks />
        <Closer ctaCopy={ctaCopy} />
      </main>
      <Footer />
      <StickyBar ctaCopy={ctaCopy} />
    </>
  );
}
