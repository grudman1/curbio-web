import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignShell from "@/components/campaign/CampaignShell";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import { MARKETS } from "@/config/markets";
import { resolveMarket } from "@/lib/resolveMarket";
import { CAMPAIGNS, CAMPAIGN_BY_SLUG } from "@/config/campaigns";
import { routeMetadata } from "@/config/routes";
import { VARIANTS, isVariant } from "@/lib/ctaVariant";

// ─────────────────────────────────────────────────────────────────────────────
// EDGE PATH, per-market. Identical to ../../../m/[market] except the variant
// is a ROUTE PARAM instead of a cookie read after hydration.
//
// This is the page the flash-of-wrong-variant actually happens on: the sibling
// route prerenders REAL hero content, and CampaignShell would swap the variant
// on hydration in front of the visitor. Here the middleware has already
// bucketed the curbio_vid cookie and rewritten to the matching variant, so the
// HTML leaving the CDN is correct on the first byte and CampaignShell's client
// swap is disabled by the `variant` prop.
//
// Reading `params` keeps this prerenderable — the same trick /m/[market] uses.
// Reading the cookie HERE would flip the route to per-request rendering and
// cost the TTFB architecture email bursts depend on. That is the whole reason
// the variant travels as a path segment.
//
// Visitors never see this URL: middleware rewrites, it does not redirect.
// Reached only when ACTIVE_EXPERIMENT.surface === "edge" (lib/ctaVariant.ts).
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 120;
export const dynamicParams = false;

export function generateStaticParams() {
  // campaigns with a picker × variants × markets. Mirrors the sibling route's
  // product, one level wider. A campaign without a picker contributes nothing.
  return CAMPAIGNS.filter((c) => c.market.mode === "picker").flatMap((c) =>
    VARIANTS.flatMap((variant) =>
      MARKETS.map((m) => ({ campaign: c.slug, variant, market: m.slug }))
    )
  );
}

export const metadata: Metadata = routeMetadata("/m/:market");

export default async function CampaignVariantMarketPage({
  params,
}: {
  params: Promise<{ campaign: string; variant: string; market: string }>;
}) {
  const { campaign, variant, market: slug } = await params;
  const page = CAMPAIGN_BY_SLUG[campaign];
  if (!page || !isVariant(variant)) notFound();

  const { market: resolved, crmMarketName } = await resolveMarket({ market: slug });

  return (
    <CampaignShell
      page={page}
      market={getCampaignMarket(resolved?.slug ?? slug)}
      crmMarketName={crmMarketName ?? null}
      variant={variant}
    />
  );
}
