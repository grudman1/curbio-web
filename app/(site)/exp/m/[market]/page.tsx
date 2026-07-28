import type { Metadata } from "next";
import CampaignShell from "@/components/campaign/CampaignShell";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import { MARKETS } from "@/config/markets";
import { resolveMarket } from "@/lib/resolveMarket";
import { exp } from "@/config/campaigns/exp";
import { routeMetadata } from "@/config/routes";

// Per-market rewrite targets for /exp — the partner-tier twin of
// /lp/[campaign]/m/[market], rendering the same template from the same config.
export const revalidate = 120;
export const dynamicParams = false;

export function generateStaticParams() {
  return MARKETS.map((m) => ({ market: m.slug }));
}

// Same tier as /exp and flips with it. These render the SAME content as the
// parent, so config/routes.ts gives them an explicit canonical to /exp — the
// moment indexing is switched on they would otherwise compete with it.
export const metadata: Metadata = {
  ...exp.meta,
  ...routeMetadata("/exp/m/:market"),
};

export default async function ExpMarketPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market: slug } = await params;
  const { market: resolved, crmMarketName } = await resolveMarket({ market: slug });

  return (
    <CampaignShell
      page={exp}
      market={getCampaignMarket(resolved?.slug ?? slug)}
      crmMarketName={crmMarketName ?? null}
    />
  );
}
