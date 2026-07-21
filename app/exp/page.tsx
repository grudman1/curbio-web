import { Suspense } from "react";
import type { Metadata } from "next";
import ExpHomeClient from "@/components/ExpHomeClient";
import ExpPageSkeleton from "@/components/ExpPageSkeleton";

// Noindex until DNS cutover and go.curbio.com/exp redirect are verified.
export const metadata: Metadata = {
  title: "Curbio for eXp Realty — Pre-listing Home Improvement",
  description:
    "Curbio is the preferred pre-listing home improvement partner for eXp Realty agents. " +
    "Repairs, refreshes, and staging — fully managed, with pay-at-closing for qualified sellers.",
  robots: { index: false, follow: false },
};

// /exp is fully prerendered and served from the CDN edge, same architecture
// as `/`: the middleware rewrites /exp?market=<slug> to the prerendered
// /exp/m/<slug> pages, and everything request-dependent (?zip=, ?status=,
// IP geo, the curbio.com 301's utm/referral params) resolves client-side —
// see components/ExpHomeClient.tsx and components/useMarketResolution.ts.
//
// Do NOT read searchParams / headers / cookies here: any of them would flip
// the route back to per-request rendering (ƒ in the build route table).
export default function ExpPage() {
  // Suspense is required for useSearchParams inside ExpHomeClient to coexist
  // with prerendering; the fallback IS the prerendered HTML (and first paint).
  return (
    <Suspense fallback={<ExpPageSkeleton />}>
      <ExpHomeClient />
    </Suspense>
  );
}
