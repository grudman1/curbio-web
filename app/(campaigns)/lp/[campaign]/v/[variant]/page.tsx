import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignClient from "@/components/campaign/CampaignClient";
import CampaignShell from "@/components/campaign/CampaignShell";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import { resolveMarket } from "@/lib/resolveMarket";
import PageSkeleton from "@/components/PageSkeleton";
import ExpPageSkeleton from "@/components/ExpPageSkeleton";
import { CAMPAIGNS, CAMPAIGN_BY_SLUG } from "@/config/campaigns";
import { routeMetadata } from "@/config/routes";
import { VARIANTS, isVariant } from "@/lib/ctaVariant";

// ─────────────────────────────────────────────────────────────────────────────
// EDGE PATH, campaign base path. Mirrors ../../page.tsx with the variant as a
// route param. Reached only via middleware rewrite when
// ACTIVE_EXPERIMENT.surface === "edge"; the visitor's URL never shows it.
//
// WHERE THIS ACTUALLY MATTERS — worth knowing before assuming it does:
//
//   fixed-market campaigns render real content SERVER-side, so the hero is in
//   the prerendered HTML and the client-side swap is visible. The variant prop
//   below is what removes that flash. This is the case the edge path is for.
//
//   picker campaigns (today: /lp/sell) prerender a SKELETON — CampaignClient
//   resolves the market in the browser and renders the shell there. There is
//   no server-rendered hero to flash, so the client path is already
//   flash-free and the variant is read from the cookie downstream exactly as
//   before. This route still prerenders for them so a rewrite can never 404,
//   but it buys nothing; the per-market siblings are where picker traffic
//   gets the benefit.
//
// Same rule as every campaign route: do NOT read headers/cookies/searchParams
// here, or the route stops being static.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamicParams = false;

export function generateStaticParams() {
  // Every campaign × every variant — including picker campaigns, which gain
  // nothing but must exist as rewrite targets so middleware cannot 404.
  return CAMPAIGNS.flatMap((c) => VARIANTS.map((variant) => ({ campaign: c.slug, variant })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaign: string; variant: string }>;
}): Promise<Metadata> {
  const { campaign } = await params;
  const page = CAMPAIGN_BY_SLUG[campaign];
  if (!page) return {};
  return { ...(page.meta ?? {}), ...routeMetadata("/") };
}

export default async function CampaignVariantPage({
  params,
}: {
  params: Promise<{ campaign: string; variant: string }>;
}) {
  const { campaign, variant } = await params;
  const page = CAMPAIGN_BY_SLUG[campaign];
  if (!page || !isVariant(variant)) notFound();

  if (page.market.mode === "fixed") {
    const { market: resolved, crmMarketName } = await resolveMarket({ market: page.market.slug });
    return (
      <CampaignShell
        page={page}
        market={getCampaignMarket(resolved?.slug ?? page.market.slug)}
        crmMarketName={crmMarketName ?? null}
        variant={variant}
      />
    );
  }

  // Picker mode: the prerendered output is the skeleton, same as the sibling
  // route. CampaignClient buckets from the cookie itself — no flash to fix.
  const Skeleton = page.partner ? ExpPageSkeleton : PageSkeleton;
  return (
    <Suspense fallback={<Skeleton />}>
      <CampaignClient page={page} />
    </Suspense>
  );
}
