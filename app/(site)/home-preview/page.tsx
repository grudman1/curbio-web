import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { BrokerageMarquee } from "@/components/home/BrokerageMarquee";
import { HomeResults } from "@/components/home/HomeResults";
import { DealTimeline } from "@/components/home/DealTimeline";
import { MoveInStats } from "@/components/home/MoveInStats";
import { EditorialBreak } from "@/components/home/EditorialBreak";
import { OurWork } from "@/components/home/OurWork";
import { PayAtClosing } from "@/components/home/PayAtClosing";
import { QualifyCard } from "@/components/home/QualifyCard";
import { SixWaysIn } from "@/components/home/SixWaysIn";
import { BrokerQuotes } from "@/components/home/BrokerQuotes";
import { MarketsManagers } from "@/components/home/MarketsManagers";
import { HomeCloser } from "@/components/home/HomeCloser";
import { HomeFooter } from "@/components/home/HomeFooter";
import "@/components/home/home.css";

// ─────────────────────────────────────────────────────────────────────────────
// /home-preview — the approved homepage design, ported into the app.
//
// This is the faithful componentized port of the approved standalone design
// file ("Curbio Homepage Design Preview.html", Aug 2026). It is NOT the
// homepage yet: it lives at an unlinked path, noindex/nofollow via
// config/routes.ts, absent from the sitemap and every nav, and 404s publicly
// on sell.curbio.com (campaign-host allowlist). Promoting it to "/" is a
// deliberate future step — flipping this route's entry — never a side effect.
//
// It sits OUTSIDE the (chrome) group on purpose: the design carries its own
// header and footer, and SiteHeader/SiteFooter wrapping it would double the
// chrome, exactly like the /exp precedent.
//
// STUBS (see each component): the hero address field and closer CTA are
// inert; nothing on this page touches /api/lead or /api/resolve.
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
      <BrokerageMarquee />
      <HomeResults />
      <DealTimeline />
      <MoveInStats />
      <EditorialBreak />
      <OurWork />
      <PayAtClosing />
      <QualifyCard />
      <SixWaysIn />
      <BrokerQuotes />
      <MarketsManagers />
      <HomeCloser />
      <HomeFooter />
    </div>
  );
}
