"use client";

import { useEffect, useState } from "react";
import { CAMPAIGN_PREFIX, MARKET_LINK_BASES } from "@/config/routes";

// ─────────────────────────────────────────────────────────────────────────────
// One prerendered HTML, two URL shapes.
//
// The campaign pages are prerendered once at their PHYSICAL path (/lp/sell/…)
// and served under two different visitor-facing URLs:
//
//   sell.curbio.com/          ← middleware rewrite; the address bar keeps "/"
//   <preview>.vercel.app/lp/sell   ← direct, for QA
//
// Same bytes, different base. Internal links therefore cannot be baked in as
// one absolute path at build time and be right in both places.
//
// Resolution: SSR emits today's values verbatim ("/", "/confirm", …) so the
// production HTML is byte-identical to what shipped before the restructure,
// and an effect corrects the base afterwards for the QA shape only. On
// sell.curbio.com window.location.pathname IS "/", so the effect is a no-op
// there and production behaviour is provably unchanged.
//
// This is the same shape as PageShell's A/B variant: render the SSR-safe
// default, reconcile on mount. Doing it during render instead would mean
// usePathname() returning the physical path on the server and the rewritten
// path on the client — a hydration mismatch on every campaign page.
// ─────────────────────────────────────────────────────────────────────────────

/** Campaign base for a given pathname. "/" unless we're being served at the
 *  physical QA path, in which case links must carry the prefix. */
export function campaignBaseFor(pathname: string): string {
  return pathname === CAMPAIGN_PREFIX || pathname.startsWith(`${CAMPAIGN_PREFIX}/`)
    ? CAMPAIGN_PREFIX
    : "/";
}

/**
 * Base for MARKET links (`?market=`) — the page's OWN mount, which is not the
 * same as the campaign base above.
 *
 * campaignBaseFor() answers "where is /confirm" and returns "/" for /exp,
 * which is right: /exp/confirm does not exist. Reusing that answer for the
 * market picker sent every eXp agent who chose a market to "/?market=x" — the
 * generic homepage — losing the co-brand, the partner header, and the
 * "eXp realty" referralSourceId. Middleware has always been ready for the
 * correct link (MARKET_REWRITES maps "/exp" → "/exp/m"); nothing ever built it.
 */
export function marketBaseFor(pathname: string): string {
  for (const mount of MARKET_LINK_BASES) {
    if (pathname === mount || pathname.startsWith(`${mount}/`)) return mount;
  }
  return "/";
}

/** Base path for campaign-internal links. Always "/" on the server and on the
 *  first client render; corrected on mount when serving the QA shape. */
export function useCampaignBase(): string {
  const [base, setBase] = useState("/");
  useEffect(() => {
    setBase(campaignBaseFor(window.location.pathname));
  }, []);
  return base;
}

/** Market-link base, resolved on mount for the same SSR-safety reason as
 *  useCampaignBase: pathname differs between server and client under a
 *  rewrite, so reading it during render is a hydration mismatch. */
export function useMarketBase(): string {
  const [base, setBase] = useState("/");
  useEffect(() => {
    setBase(marketBaseFor(window.location.pathname));
  }, []);
  return base;
}

/** Join the campaign base with a sub-path. `campaignHref("/", "/confirm")`
 *  → "/confirm"; `campaignHref("/lp/sell", "/confirm")` → "/lp/sell/confirm". */
export function campaignHref(base: string, sub: string): string {
  const b = base === "/" ? "" : base.replace(/\/$/, "");
  return `${b}${sub}` || "/";
}
