import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignShell from "@/components/campaign/CampaignShell";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import { MARKETS } from "@/config/markets";
import { resolveMarket } from "@/lib/resolveMarket";
import { CAMPAIGNS, CAMPAIGN_BY_SLUG } from "@/config/campaigns";
import { routeMetadata } from "@/config/routes";

// Prerendered per-market pages for every campaign that has a market picker.
// The middleware rewrites /?market=<slug> here, so campaign-email traffic is
// served straight from the CDN edge — the visitor's URL is unchanged.
//
// ISR keeps the operator-API data (crmMarketName) fresh OFF the request path:
// revalidate matches the 120s operator data-cache TTL.

export const revalidate = 120;
export const dynamicParams = false;

export function generateStaticParams() {
  // Cartesian product of picker-enabled campaigns × markets. A campaign with
  // marketPicker: false contributes nothing, so single-market pages cost no
  // prerendered variants.
  return CAMPAIGNS.filter((c) => c.market.mode === "picker").flatMap((c) =>
    MARKETS.map((m) => ({ campaign: c.slug, market: m.slug }))
  );
}

export const metadata: Metadata = routeMetadata("/m/:market");

export default async function CampaignMarketPage({
  params,
}: {
  params: Promise<{ campaign: string; market: string }>;
}) {
  const { campaign, market: slug } = await params;
  const page = CAMPAIGN_BY_SLUG[campaign];
  if (!page) notFound();

  // Exactly the resolution the client runs for ?market=: operator API for the
  // live crmMarketName, static catalog fallback. The market branch never reads
  // headers or cookies, so this stays prerenderable — it runs at build and
  // revalidate time only.
  const { market: resolved, crmMarketName } = await resolveMarket({ market: slug });

  return (
    <CampaignShell
      page={page}
      market={getCampaignMarket(resolved?.slug ?? slug)}
      crmMarketName={crmMarketName ?? null}
    />
  );
}
