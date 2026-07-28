import { Suspense } from "react";
import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import PageSkeleton from "@/components/PageSkeleton";
import { routeMetadata } from "@/config/routes";

// Campaign tier: noindex. This page converts paid and email traffic; it is
// not meant to rank, and at DNS cutover it 301s to curbio.com/sell. NOTE this
// is the one intentional change to the rendered HTML of the live "/" — it adds
// a robots meta tag that was not there before.
export const metadata: Metadata = routeMetadata("/");

// `/` is fully prerendered and served from the CDN edge — the request never
// invokes a serverless function, so email-burst cold starts can't touch TTFB.
//
// Campaign links (/?market=<slug>) are rewritten by the middleware to the
// prerendered /m/<slug> pages and never render this component. Everything
// request-dependent (?zip=, ?status=, IP geo) resolves client-side over the
// prerendered skeleton — see components/HomeClient.tsx.
//
// Do NOT read searchParams / headers / cookies here: any of them would flip
// the route back to per-request rendering (ƒ in the build route table).
export default function Page() {
  // Suspense is required for useSearchParams inside HomeClient to coexist
  // with prerendering; the fallback IS the prerendered HTML (and first paint).
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeClient />
    </Suspense>
  );
}
