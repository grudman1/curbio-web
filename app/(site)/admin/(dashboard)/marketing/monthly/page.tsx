import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { HubPageHeader } from "../hubUi";
import { MonthlyReview } from "./MonthlyReview";

// ─────────────────────────────────────────────────────────────────────────────
// Monthly — the exec review. Everything else in the Hub is for the operator;
// this page shows the exec team what's working and what isn't, and must
// survive being read by people who have never seen the other seven tabs.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Marketing · Monthly · Control Room — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.monthly;

export default function MonthlyPage() {
  const markets = MARKETS.map((m) => ({ key: m.slug, label: m.name }));
  return (
    <>
      <div className="mh-no-print">
        <HubPageHeader surface={surface} />
      </div>
      <MonthlyReview markets={markets} />
    </>
  );
}
