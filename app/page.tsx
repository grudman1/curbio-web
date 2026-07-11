import HomeClient from "@/components/HomeClient";

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
  return <HomeClient />;
}
