"use client";

import { useEffect, useState } from "react";
import PageShell from "./PageShell";
import WaitlistShell from "./WaitlistShell";
import PageSkeleton from "./PageSkeleton";
import { getCampaignMarket, NEUTRAL_MARKET } from "@/lib/campaignMarkets";
import { canonicalSlug } from "@/lib/markets";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side market resolution for the prerendered `/` page.
//
// `/` is served straight from the CDN edge — no serverless function, no
// operator-API call on the request path. Anything that needs the request
// (?zip=, ?code=, ?status=, IP geolocation) resolves here instead, via
// GET /api/resolve, which wraps the same lib/resolveMarket.ts logic the
// server used to run. The skeleton (already the prerendered HTML) holds the
// exact layout while resolution is in flight, so swapping in the resolved
// shell causes no layout shift — the same swap streaming SSR performed.
//
// ?market= links never reach this path in production: the middleware
// rewrites recognized slugs to the prerendered /m/<slug> pages. The market
// branch below is the safety net — it preserves the resolution priority
// (?market= always wins; unrecognized slug → neutral, NEVER geo) even if
// the rewrite is somehow skipped.
// ─────────────────────────────────────────────────────────────────────────────

type Resolution =
  | { view: "market"; slug: string; crmMarketName: string | null }
  | { view: "neutral" }
  | { view: "waitlist"; outZip?: string; geoCity?: string; geoRegion?: string };

export default function HomeClient() {
  const [res, setRes] = useState<Resolution | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Read the query string directly (not useSearchParams) — this must be the
    // original landing URL, and FormCard's clean-URL strip only runs after the
    // resolved shell (and FormCard with it) mounts, so the params are intact.
    const params = new URLSearchParams(window.location.search);

    const marketParam = params.get("market");
    if (marketParam) {
      const slug = canonicalSlug(marketParam);
      // Recognized slug → static catalog content (crmMarketName null — the
      // operator-API fallback path). Unrecognized → neutral, never geo.
      setRes(slug ? { view: "market", slug, crmMarketName: null } : { view: "neutral" });
      return;
    }

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
  }, []);

  if (!res) return <PageSkeleton />;

  if (res.view === "waitlist") {
    return <WaitlistShell outZip={res.outZip} geoCity={res.geoCity} geoRegion={res.geoRegion} />;
  }

  if (res.view === "market") {
    return <PageShell market={getCampaignMarket(res.slug)} crmMarketName={res.crmMarketName} />;
  }

  return <PageShell market={NEUTRAL_MARKET} crmMarketName={null} neutral showPicker />;
}
