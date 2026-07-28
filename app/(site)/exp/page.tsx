import { Suspense } from "react";
import type { Metadata } from "next";
import CampaignClient from "@/components/campaign/CampaignClient";
import ExpPageSkeleton from "@/components/ExpPageSkeleton";
import { exp } from "@/config/campaigns/exp";
import { routeMetadata } from "@/config/routes";

// PARTNER tier — the first of ~50, and the test that the campaign template
// generalises. Same component as /lp/<name>; only the config and the MOUNT
// differ. It lives in the site group at a real path because it earns inbound
// links and must be indexable, which the campaign tier never is.
//
// Indexability comes from config/routes.ts keyed on this route, not from the
// config below: flipping `indexed` there at cutover removes the noindex and
// adds the canonical together.
export const metadata: Metadata = {
  ...exp.meta,
  ...routeMetadata("/exp"),
};

export default function ExpPage() {
  return (
    <Suspense fallback={<ExpPageSkeleton />}>
      <CampaignClient page={exp} />
    </Suspense>
  );
}
