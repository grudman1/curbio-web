import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { HomeHero } from "@/components/home/HomeHero";
import { ProofBand } from "@/components/home/ProofBand";
import { HowItWorks } from "@/components/home/HowItWorks";
import { QualifyCard } from "@/components/home/QualifyCard";
import { DealTimeline } from "@/components/home/DealTimeline";
import { MoveInStats } from "@/components/home/MoveInStats";
import { StatBand } from "@/components/sections/StatBand";
import { HomeResults } from "@/components/home/HomeResults";
import { BeforeAfterProof } from "@/components/home/BeforeAfterProof";
import { AudienceRouter } from "@/components/home/AudienceRouter";
import { OurWork } from "@/components/home/OurWork";
import { MarketsManagers } from "@/components/home/MarketsManagers";
import { AppShowcase } from "@/components/home/AppShowcase";
import { AwardsStrip } from "@/components/home/AwardsStrip";
import { HomeCloser } from "@/components/home/HomeCloser";

// ─────────────────────────────────────────────────────────────────────────────
// /home-preview — the approved homepage, awaiting promotion to "/".
//
// The design was signed off (Aug 2026). Its header and footer were promoted
// to the global site chrome (components/site/SiteHeader + SiteFooter, mounted
// by app/(site)/(chrome)/layout.tsx), and this page moved under (chrome) to
// inherit them — it no longer mounts its own. Its CSS is now
// components/site/site.css (the .c- families, formerly .dp- in home.css).
//
// See the git history of app/(site)/home-preview/page.tsx for the full v1→v2
// design narrative (section order, the field plan, the restored marquee, the
// hero scrim math) — all of it still applies to the sections below.
//
// Still NOT the homepage: unlinked, noindex/nofollow via config/routes.ts,
// absent from sitemap and nav, 404s publicly on sell.curbio.com. Promoting it
// to "/" is a deliberate later change to config/routes.ts + pageRegistry —
// it must never happen as a side effect of other work.
//
// STUBS flagged inline in the components: hero ZIP field and its CTA are
// inert; [rating]/[count]/awards are pending data; the app recording
// placeholder was explicitly approved. The Notable estimator card is LIVE
// (app/api/notable-estimate, no PII).
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Curbio — homepage design preview",
  description:
    "Curbio is the pre-listing home improvement partner real estate agents trust. Repairs, refreshes, and staging — fully managed, with pay-at-closing for qualified sellers.",
  ...routeMetadata("/home-preview"),
};

// The three staging figures, pulled out of the agent-video section into their
// own band. Values unchanged; they dial up from 0 on scroll (see CountUp).
const BUYER_STATS = [
  { value: 94, suffix: "%", label: <>of buyers want move-in ready<sup>1</sup></> },
  { value: 25, prefix: "~", suffix: "%", label: <>more for a staged home<sup>1</sup></> },
  { value: 73, prefix: "~", suffix: "%", label: <>less time on market<sup>1</sup></> },
];

export default function HomePreviewPage() {
  return (
    <>
      <HomeHero />
      <ProofBand />
      <HowItWorks />
      <BeforeAfterProof />
      <HomeResults />
      <QualifyCard />
      <DealTimeline />
      <MoveInStats />
      <StatBand
        id="buyer-stats"
        label="What buyers reward"
        stats={BUYER_STATS}
        footnote={
          <>
            <sup>1</sup> Sources being supplied separately.
          </>
        }
      />
      <AudienceRouter />
      <OurWork />
      <MarketsManagers />
      <AppShowcase />
      <AwardsStrip />
      <HomeCloser />
    </>
  );
}
