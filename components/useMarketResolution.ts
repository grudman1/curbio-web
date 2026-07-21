"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { canonicalSlug } from "@/lib/markets";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side market resolution for the prerendered landing routes (/ and
// /exp — see HomeClient / ExpHomeClient for the route-specific rendering).
//
// Those routes are served straight from the CDN edge — no serverless
// function, no operator-API call on the request path. Anything that needs
// the request (?zip=, ?code=, ?status=, IP geolocation) resolves here
// instead, via GET /api/resolve, which wraps the same lib/resolveMarket.ts
// logic the server used to run.
//
// ?market= links never reach this path in production: the middleware
// rewrites recognized slugs to the prerendered per-market pages. The market
// branch below is the safety net — it preserves the resolution priority
// (?market= always wins; unrecognized slug → neutral, NEVER geo) even if
// the rewrite is somehow skipped.
//
// useSearchParams (not a mount-only window.location read) so client-side
// navigations that STAY on the route re-resolve — e.g. the market picker's
// ZIP field firing router.push("?zip=…") from the neutral view. It requires
// a Suspense boundary in the consuming page to keep the route prerenderable.
// ─────────────────────────────────────────────────────────────────────────────

export type Resolution =
  | { view: "market"; slug: string; crmMarketName: string | null }
  | { view: "neutral" }
  | { view: "waitlist"; outZip?: string; geoCity?: string; geoRegion?: string };

const RESOLUTION_KEYS = ["market", "zip", "code", "status"] as const;

/** Null while resolution is in flight — render the route's skeleton. */
export function useMarketResolution(): Resolution | null {
  const [res, setRes] = useState<Resolution | null>(null);
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  // The search string the current view was resolved from — null until the
  // first resolution kicks off.
  const lastResolved = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const hasResolutionParams = RESOLUTION_KEYS.some((k) => params.has(k));

    // This effect re-runs on client navigations AND on FormCard's clean-URL
    // replaceState strip (Next syncs useSearchParams for both). A strip only
    // ever REMOVES params — so once a view is resolved, a search string with
    // no resolution-relevant params must NOT re-trigger geo and stomp the
    // view the visitor's explicit ?zip=/?market= produced.
    if (lastResolved.current !== null && !hasResolutionParams) return;
    if (lastResolved.current === search) return;
    lastResolved.current = search;

    let cancelled = false;

    const marketParam = params.get("market");
    if (marketParam) {
      const slug = canonicalSlug(marketParam);
      // Recognized slug → static catalog content (crmMarketName null — the
      // operator-API fallback path). Unrecognized → neutral, never geo.
      setRes(slug ? { view: "market", slug, crmMarketName: null } : { view: "neutral" });
      return;
    }

    setRes(null); // hold the skeleton while (re-)resolution is in flight

    const qs = new URLSearchParams();
    for (const k of ["zip", "code", "status"] as const) {
      const v = params.get(k);
      if (v) qs.set(k, v);
    }
    fetch(`/api/resolve?${qs.toString()}`, { signal: AbortSignal.timeout(6000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.source === "out-of-area") {
          setRes({
            view: "waitlist",
            outZip: data.outZip ?? undefined,
            geoCity: data.geoCity ?? undefined,
            geoRegion: data.geoRegion ?? undefined,
          });
        } else if (data?.slug) {
          setRes({ view: "market", slug: data.slug, crmMarketName: data.crmMarketName ?? null });
        } else {
          setRes({ view: "neutral" });
        }
      })
      .catch(() => {
        // Resolution failed or timed out — the neutral chooser always works.
        if (!cancelled) setRes({ view: "neutral" });
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  return res;
}
