import type { Metadata } from "next";
import CampaignShell from "@/components/campaign/CampaignShell";
import { NEUTRAL_MARKET } from "@/lib/campaignMarkets";
import { stagingDesignDc } from "@/config/campaigns/staging-design-dc";
import { routeMetadata } from "@/config/routes";

// PARTNER tier — same template and same component as /exp, different config
// and a different mount.
//
// Rendered SERVER-side with no Suspense and no skeleton, unlike /exp: this
// page resolves no market (`market: { mode: "none" }`), so there is nothing
// for the client to resolve and nothing to swap in afterwards. The first
// paint is the final page.
//
// Indexability comes from config/routes.ts keyed on this route, not from the
// config: noindex at launch, and flipping `indexed` there removes the noindex
// and adds the canonical together.
export const metadata: Metadata = {
  ...stagingDesignDc.meta,
  ...routeMetadata("/staging-design-dc"),
};

export default function StagingDesignDcPage() {
  return (
    <CampaignShell
      page={stagingDesignDc}
      market={NEUTRAL_MARKET}
      crmMarketName={null}
      neutral
    />
  );
}
