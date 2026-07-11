import { Suspense } from "react";
import HomeClient from "@/components/HomeClient";
import PageSkeleton from "@/components/PageSkeleton";

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
