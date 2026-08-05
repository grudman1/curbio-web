import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { ProofBand } from "@/components/home/ProofBand";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PayAtClosing } from "@/components/home/PayAtClosing";
import { DealTimeline } from "@/components/home/DealTimeline";
import { MoveInStats } from "@/components/home/MoveInStats";
import { SixWaysIn } from "@/components/home/SixWaysIn";
import { AudienceRouter } from "@/components/home/AudienceRouter";
import { OurWork } from "@/components/home/OurWork";
import { MarketsManagers } from "@/components/home/MarketsManagers";
import { AppShowcase } from "@/components/home/AppShowcase";
import { AwardsStrip } from "@/components/home/AwardsStrip";
import { HomeCloser } from "@/components/home/HomeCloser";
import { HomeFooter } from "@/components/home/HomeFooter";
import "@/components/home/home.css";

// ─────────────────────────────────────────────────────────────────────────────
// /home-preview — the homepage design preview, v2.
//
// v1 was the faithful port of the approved design file; v2 applies the
// written homepage revisions (Aug 2026): reordered around what Curbio does
// and pay-at-closing, split hero with the transformation video, proof band,
// how-it-works, audience router, app + awards sections. Removed: the
// editorial paragraph, the Notable estimator, the results marquee (its
// category cards were flagged stand-ins), and the standalone quotes block
// (both quotes moved onto the router cards).
//
// Still NOT the homepage: unlinked, noindex/nofollow via config/routes.ts,
// absent from sitemap and nav, 404s publicly on sell.curbio.com. Outside
// (chrome) on purpose — the design carries its own header and footer.
//
// STUBS flagged inline: hero ZIP field and CTAs are inert (nothing touches
// /api/lead or /api/resolve); router card targets are planned pages;
// [rating]/[count]/awards are pending data; the app recording placeholder
// was explicitly approved.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Curbio — homepage design preview",
  description:
    "Curbio is the pre-listing home improvement partner real estate agents trust. Repairs, refreshes, and staging — fully managed, with pay-at-closing for qualified sellers.",
  ...routeMetadata("/home-preview"),
};

export default function HomePreviewPage() {
  return (
    <div className="dp-page">
      <HomeHeader />
      <HomeHero />
      <ProofBand />
      <HowItWorks />
      <PayAtClosing />
      <DealTimeline />
      <MoveInStats />
      <SixWaysIn />
      <AudienceRouter />
      <OurWork />
      <MarketsManagers />
      <AppShowcase />
      <AwardsStrip />
      <HomeCloser />
      <HomeFooter />
    </div>
  );
}
