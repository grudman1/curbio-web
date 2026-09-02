import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MARKET_BY_SLUG, marketPath } from "@/config/markets";
import CampaignShell from "@/components/campaign/CampaignShell";
import { marketContentFor, marketIsPublishable } from "@/components/market/marketContent";
import { MARKET_ESTIMATE_PAGE } from "@/components/market/marketEstimatePage";
import type { MarketLocationPrefill } from "@/components/market/MarketEstimateExperience";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import { buildResolvedMarketFromSlug } from "@/lib/markets";
import { resolveMarket } from "@/lib/resolveMarket";
import { routeMetadata } from "@/config/routes";

// The shared campaign conversion spine, mounted at the site's canonical market
// routes with local-content sections around it. Every served market retains a
// noindex estimate fallback; only markets that pass marketContentFor's complete
// local-proof gate can ever inherit indexable route metadata.

export const dynamic = "force-dynamic";

function parseLocationPrefill(raw: string | undefined): MarketLocationPrefill | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const input = typeof parsed.input === "string" ? parsed.input.trim().slice(0, 250) : "";
    if (!input) return null;
    const zip = typeof parsed.zip === "string" && /^\d{5}$/.test(parsed.zip) ? parsed.zip : undefined;
    const address = typeof parsed.address === "string" ? parsed.address.trim().slice(0, 250) : undefined;
    return { input, ...(zip ? { zip } : {}), ...(address ? { address } : {}) };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const market = MARKET_BY_SLUG[slug];
  if (!market) return {};
  const tierMetadata = routeMetadata("/markets/:slug");
  const eligible = marketIsPublishable(slug);
  return {
    title: `Curbio Concierge in ${market.displayName} — Free Listing Estimate`,
    description: `A local Curbio team manages repairs, updates, and staging for ${market.displayName} listings. Qualified sellers can pay at closing.`,
    ...tierMetadata,
    // Local proof is a second lock on top of the site-wide cutover switch.
    // Thin markets stay noindex even after the site tier goes live.
    ...(!eligible
      ? { robots: { index: false, follow: false } }
      : tierMetadata.robots
        ? {}
        : { alternates: { canonical: marketPath(market.slug) } }),
  };
}

export default async function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!MARKET_BY_SLUG[slug]) notFound();

  const [resolution, cookieStore] = await Promise.all([
    resolveMarket({ market: slug }),
    cookies(),
  ]);
  const resolvedMarket = resolution.market ?? buildResolvedMarketFromSlug(slug);
  if (!resolvedMarket) notFound();

  const location = parseLocationPrefill(cookieStore.get("curbio_market_prefill")?.value);
  return (
    <CampaignShell
      page={MARKET_ESTIMATE_PAGE}
      market={getCampaignMarket(slug)}
      crmMarketName={resolution.crmMarketName}
      marketExperience={{ resolvedMarket, location, content: marketContentFor(slug) }}
    />
  );
}
