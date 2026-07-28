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

// ─────────────────────────────────────────────────────────────────────────────
// THE campaign landing page. One route, N configs.
//
// Adding a landing page is a file in config/campaigns/ plus a line in its
// index — this file never changes. It stays fully prerendered and served from
// the CDN edge: everything request-dependent (?zip=, ?status=, ?market=, IP
// geo, ?n=/?e= prefill) resolves client-side over the prerendered skeleton.
//
// Do NOT read searchParams / headers / cookies here — any of them flips the
// route to per-request rendering (ƒ in the build table) and gives up the TTFB
// architecture that email bursts depend on.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamicParams = false;

export function generateStaticParams() {
  return CAMPAIGNS.map((c) => ({ campaign: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaign: string }>;
}): Promise<Metadata> {
  const { campaign } = await params;
  const page = CAMPAIGN_BY_SLUG[campaign];
  if (!page) return {};
  // Campaign tier is never indexed — from config/routes.ts, not from the
  // campaign config, so no landing page can opt itself into being indexed.
  return { ...(page.meta ?? {}), ...routeMetadata("/") };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ campaign: string }>;
}) {
  const { campaign } = await params;
  const page = CAMPAIGN_BY_SLUG[campaign];
  if (!page) notFound();

  // A fixed-market page needs no client-side resolution, so it renders on the
  // server with real content instead of shipping a skeleton that resolves to
  // nothing. Same operator-API lookup the per-market variants perform.
  if (page.market.mode === "fixed") {
    const { market: resolved, crmMarketName } = await resolveMarket({ market: page.market.slug });
    return (
      <CampaignShell
        page={page}
        market={getCampaignMarket(resolved?.slug ?? page.market.slug)}
        crmMarketName={crmMarketName ?? null}
      />
    );
  }

  const Skeleton = page.partner ? ExpPageSkeleton : PageSkeleton;

  // Suspense lets useSearchParams inside the client tree coexist with
  // prerendering; the fallback IS the prerendered HTML, and the first paint.
  return (
    <Suspense fallback={<Skeleton />}>
      <CampaignClient page={page} />
    </Suspense>
  );
}
