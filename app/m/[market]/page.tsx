import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import { BY_SLUG } from "@/lib/markets";
import { resolveMarket } from "@/lib/resolveMarket";

// ─────────────────────────────────────────────────────────────────────────────
// Prerendered per-market pages. The middleware rewrites /?market=<slug> here,
// so campaign-email traffic is served straight from the CDN edge — the URL
// the visitor sees stays sell.curbio.com/?market=<slug>.
//
// ISR keeps the operator-API data (crmMarketName) fresh OFF the request path:
// revalidate matches the 120s operator data-cache TTL, so the page is at most
// ~2 minutes staler than the dynamic render was, at zero request-time cost.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 120;
// Only the canonical catalog slugs exist; the middleware canonicalizes
// aliases before rewriting. Anything else → 404.
export const dynamicParams = false;

// These URLs are internal rewrite targets, never linked publicly — point
// search engines at the real landing URL.
export const metadata: Metadata = {
  alternates: { canonical: "https://sell.curbio.com/" },
};

export function generateStaticParams() {
  return Object.keys(BY_SLUG).map((market) => ({ market }));
}

export default async function MarketPage({ params }: { params: Promise<{ market: string }> }) {
  const { market: slug } = await params;

  // Exactly the resolution the dynamic page ran for ?market=: operator API
  // for live crmMarketName, static-catalog fallback on failure. The market
  // branch of resolveMarket never touches headers/cookies, so this stays
  // prerenderable — the call runs at build/revalidate time only.
  const { market: resolved, crmMarketName } = await resolveMarket({ market: slug });

  return (
    <PageShell
      market={getCampaignMarket(resolved?.slug ?? slug)}
      crmMarketName={crmMarketName ?? null}
    />
  );
}
