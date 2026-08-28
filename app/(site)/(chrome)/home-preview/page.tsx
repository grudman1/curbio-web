import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { HomeHero } from "@/components/home/HomeHero";
import { ProofBand } from "@/components/home/ProofBand";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ConciergeCompare } from "@/components/home/ConciergeCompare";
import { CapacityCalculator } from "@/components/home/CapacityCalculator";
import { MoveInStats } from "@/components/home/MoveInStats";
import { DealTimeline } from "@/components/home/DealTimeline";
import { HomeResults } from "@/components/home/HomeResults";
import { QualifyCard } from "@/components/home/QualifyCard";
import { AudienceRouter } from "@/components/home/AudienceRouter";
import { OurWork } from "@/components/home/OurWork";
import { MarketsManagers } from "@/components/home/MarketsManagers";
import { AppShowcase } from "@/components/home/AppShowcase";
import { HomeCloser } from "@/components/home/HomeCloser";
import { HomeStickyCta } from "@/components/home/HomeStickyCta";

// ─────────────────────────────────────────────────────────────────────────────
// /home-preview — the homepage, awaiting promotion to "/".
//
// ── WHAT THIS PAGE ARGUES, as of the listing-operations rebuild ─────────────
//
// It is NOT a "why prep your listing" page. Agents already know they have to
// prep. The question they actually have is why CURBIO rather than how they
// handle prep today — and "today" is a financing-only concierge program, a
// contractor directory, or their own pocket vendors. So every section proves
// one claim about the division of labour: full execution, one accountable
// local manager, disciplined fast-cosmetic scope, pay at closing with no
// liens. Anything that argued "prepped homes sell better" is gone from here.
//
// Words that must not appear on this page: "home improvement company",
// "renovation firm", "remodel" as a lead word, "our network of contractors".
//
// ── The thirteen sections ───────────────────────────────────────────────────
//   1  hero — one field, live (HeroLeadForm)
//   2  brokerage logos
//   3  the three jobs
//   4  the comparison — NEW
//   5  the capacity calculator — NEW, with the agent clip directly under it
//   6  one real deal, dated (Deer Run)
//   7  services marquee — the fast-cosmetic boundary
//   8  pay at closing + the live Notable estimator
//   9  audience router
//  10  work gallery
//  11  markets and their managers
//  12  the app
//  13  closer
//
// ── What was CUT, and where it went ─────────────────────────────────────────
//   announce bar     suppressed on this route in SiteHeader — one page, one
//                    lead; the pay-at-close message is section 8's whole job.
//   awards strip     deleted. It was five placeholder slots ([Award] ×2,
//                    [rating], [count], [press]) and a strip of brackets is
//                    worse than no strip. It returns when real credentials do.
//   buyer stats      MOVED to /how-it-works. 94% / ~25% / ~73% is seller-facing
//                    why-prep evidence, which is that page's argument, not this
//                    one's. The NEEDS FACT sourcing marker moved with it.
//   before/after     deleted as a section. Its copy ("today's buyers scroll
//     video          past tired listings") is the why-prep argument again. The
//                    clip itself still lives on /how-it-works as the draggable
//                    BeforeAfterSlider.
//   agent video      kept, stripped to its caption, and repositioned directly
//                    under the calculator — see MoveInStats.tsx.
//   rotating         retired. HowItWorks now carries one static headline; the
//     headline       .c-rot-* CSS survives unused as the A/B arm.
//
// ── Still true ──────────────────────────────────────────────────────────────
// NOT the homepage yet: unlinked, noindex/nofollow via config/routes.ts,
// absent from sitemap and nav, 404s publicly on sell.curbio.com. Promoting it
// to "/" is a deliberate later change to config/routes.ts + pageRegistry —
// it must never happen as a side effect of other work, and it did not happen
// as a side effect of this one.
//
// LIVE: the hero field (two-step, /api/resolve + /api/lead), the capacity
// calculator's email gate, the Notable estimator (no PII), the closer CTA.
// STILL A PLACEHOLDER, approved: the app screen recording (AppShowcase).
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Curbio — Listing Prep, Managed. Paid at Closing.",
  description:
    "Curbio is the listing operations team for top agents and brokerages. Full pre-listing prep — cleaning, paint, staging, photos — managed by one local manager, paid at closing with no liens.",
  // noindex/nofollow, from the tier map. It stays that way until the route
  // entry is flipped, which is the same decision as promoting this to "/".
  ...routeMetadata("/home-preview"),
};

export default function HomePreviewPage() {
  return (
    <>
      <HomeHero />
      <ProofBand />
      <HowItWorks />
      <ConciergeCompare />
      <CapacityCalculator />
      <MoveInStats />
      <DealTimeline />
      <HomeResults />
      <QualifyCard />
      <AudienceRouter />
      <OurWork />
      <MarketsManagers />
      <AppShowcase />
      <HomeCloser />
      <HomeStickyCta />
    </>
  );
}
