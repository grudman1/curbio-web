import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { HubPageHeader, NeedsBlock } from "./hubUi";

// ─────────────────────────────────────────────────────────────────────────────
// Today — the default route and the screen that matters: are we going to hit
// 50 Qualified per market this month, and if not, where is it breaking?
// Pacing cards, company total, trend, funnel, attribution health, and alerts
// land here in build order; until each source is wired, the needs block below
// is the honest state of this screen.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Today · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.today;

export default function TodayPage() {
  return (
    <>
      <HubPageHeader surface={surface} />
      <NeedsBlock surface={surface} />
    </>
  );
}
