import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { ProofBand } from "@/components/home/ProofBand";
import { HowItWorks } from "@/components/home/HowItWorks";
import { QualifyCard } from "@/components/home/QualifyCard";
import { DealTimeline } from "@/components/home/DealTimeline";
import { MoveInStats } from "@/components/home/MoveInStats";
import { HomeResults } from "@/components/home/HomeResults";
import { NavyProofBand } from "@/components/home/NavyProofBand";
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
// v1 was the faithful port of the approved design file; v2 reordered the
// page around what Curbio does and pay-at-close, and added the proof band,
// how-it-works, audience router, and app + awards sections. Removed and
// still gone: the editorial paragraph and the standalone quotes block (both
// quotes moved onto the router cards). The results marquee — the scrolling
// services list — is back as of Aug 7, minus its single-project stat row,
// and now carries its real ten services with real category photography.
//
// "Six ways in" is gone with it (Gavin, Aug 7): the marquee replaces it as
// the services section. What that dropped, if it's ever missed: per-service
// TIMELINES (1–3 weeks / 4–8 weeks / days / pre-settlement), the one-line
// descriptions, and the engagement-type taxonomy — Refreshes, Remodels,
// Repairs, Listing prep, Inspection repairs, Staging. The marquee names
// work categories instead (Interior paint, Flooring, Kitchens…), so the two
// aren't the same axis and no timing survives on the page. Recoverable at
// `git show f3e74ea:components/home/SixWaysIn.tsx`.
//
// The four proof numbers (8,000+ homes prepped / $0 until closing / 1-year
// warranty / Licensed & insured) left the hero area on Aug 8 and are now the
// full-bleed navy band — see NavyProofBand.tsx. Under the hero, ProofBand is
// a single logo row again.
//
// SECTION ORDER, reset Aug 9 (Gavin). The first six are deliberate and were
// specified directly:
//
//   hero → brokerage logos → how it works → navy numbers → services → financing
//
// The argument that order makes: who trusts us, how it works, the proof, what
// we do, then how it is paid for. Financing moved from 5th to 7th — it now
// answers a question the services section has just raised, instead of
// arriving before the reader knows what they would be financing. The navy
// band moved up from after the carousel to before it, so the numbers land as
// the turn from explanation into evidence.
//
// Everything after financing keeps its previous relative order.
//
// Two things v2 changed have since been changed back, both by request:
// the hero is the full-bleed photo again (not the split video layout —
// that variant survives, unmounted, in HomeHeroVideo.tsx for the A/B), and
// the Notable estimator is back in place of the navy pay-at-close ledger.
//
// Still NOT the homepage: unlinked, noindex/nofollow via config/routes.ts,
// absent from sitemap and nav, 404s publicly on sell.curbio.com. Outside
// (chrome) on purpose — the design carries its own header and footer.
//
// STUBS flagged inline: hero ZIP field and CTAs are inert (nothing touches
// /api/lead or /api/resolve); router card targets are planned pages;
// [rating]/[count]/awards are pending data; the app recording placeholder
// was explicitly approved; the marquee's "See all services" points at
// /services, which is `planned` in config/pageRegistry.ts. ONE exception is
// live: the Notable estimator card calls Notable's real API via
// app/api/notable-estimate (no PII).
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
      <NavyProofBand />
      <HomeResults />
      <QualifyCard />
      <DealTimeline />
      <MoveInStats />
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
