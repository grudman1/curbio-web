import type { Metadata } from "next";
import ExpShell from "@/components/ExpShell";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import { BY_SLUG } from "@/lib/markets";
import { resolveMarket } from "@/lib/resolveMarket";

// Prerendered per-market pages for the eXp co-branded route — the /exp twin
// of app/m/[market]/page.tsx. The middleware rewrites /exp?market=<slug>
// here; the visitor-facing URL stays sell.curbio.com/exp?market=<slug>.
// ISR (120s, matching the operator data-cache TTL) keeps crmMarketName
// fresh off the request path.

export const revalidate = 120;
// Only the canonical catalog slugs exist; the middleware canonicalizes
// aliases before rewriting. Anything else → 404.
export const dynamicParams = false;

// Same noindex stance as /exp itself (internal rewrite targets besides).
export const metadata: Metadata = {
  title: "Curbio for eXp Realty — Pre-listing Home Improvement",
  description:
    "Curbio is the preferred pre-listing home improvement partner for eXp Realty agents. " +
    "Repairs, refreshes, and staging — fully managed, with pay-at-closing for qualified sellers.",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return Object.keys(BY_SLUG).map((market) => ({ market }));
}

export default async function ExpMarketPage({ params }: { params: Promise<{ market: string }> }) {
  const { market: slug } = await params;

  // Operator API for live crmMarketName with static-catalog fallback — the
  // market branch of resolveMarket never touches headers/cookies, so this
  // stays prerenderable; the call runs at build/revalidate time only.
  const { market: resolved, crmMarketName } = await resolveMarket({ market: slug });

  return (
    <ExpShell
      market={getCampaignMarket(resolved?.slug ?? slug)}
      crmMarketName={crmMarketName ?? null}
    />
  );
}
