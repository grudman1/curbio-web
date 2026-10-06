"use client";

import { useLayoutEffect, useState } from "react";
import { Icon } from "./LpKit";
import type { PromoBanner as PromoBannerConfig } from "@/config/campaigns/types";

// Dismissible announcement bar, rendered above the header on pages whose
// campaign config sets `promoBanner` (today: /exp only).
//
// The page is prerendered once and served from the CDN, so the HTML always
// contains the bar — including after `endsAt`, and for visitors who closed it.
// Two layers keep it from flashing for them:
//   1. FIRST LOAD: an inline script right after the bar runs during HTML parse,
//      before first paint, and marks <html> so the CSS below hides it.
//   2. CLIENT NAVIGATION (e.g. a market switch): inline scripts do not run, so
//      a layout effect — which runs before paint — removes it instead.
// A timer also removes it at `endsAt` for a tab left open across the deadline.
//
// The dismissal is one localStorage flag per banner id: no identifier, nothing
// sent anywhere. Every storage access is guarded — private mode or blocked
// storage just means the bar comes back on the next visit.

const storageKey = (id: string) => `curbio_promo_dismissed:${id}`;

export function PromoBanner({ banner }: { banner: PromoBannerConfig }) {
  const { id, lead, linkText, href, endsAt } = banner;
  const end = Date.parse(endsAt);
  const [hidden, setHidden] = useState(false);

  useLayoutEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey(id)) === "1";
    } catch {}
    const left = end - Date.now();
    if (dismissed || !(left > 0)) {
      setHidden(true);
      return;
    }
    // setTimeout overflows past ~24.8 days; a later end just gets re-checked on
    // the next load.
    const t = window.setTimeout(() => setHidden(true), Math.min(left, 2_147_483_647));
    return () => window.clearTimeout(t);
  }, [id, end]);

  if (hidden) return null;

  function dismiss() {
    try {
      localStorage.setItem(storageKey(id), "1");
    } catch {}
    setHidden(true);
  }

  // Values are JSON-encoded into the script, never concatenated as raw text.
  const preflight =
    `(function(){try{var d=document.documentElement,id=${JSON.stringify(id)};` +
    `if(Date.now()>=${end}||localStorage.getItem(${JSON.stringify(storageKey(id))})==="1")` +
    `d.setAttribute("data-promo-off",id)}catch(e){}})();`;

  return (
    <>
      <style>{`html[data-promo-off=${JSON.stringify(id)}] .lp-promo[data-promo=${JSON.stringify(id)}]{display:none}`}</style>
      <div className="lp-promo" data-promo={id} role="region" aria-label="Announcement">
        <p className="lp-promo-text">
          {lead}{" "}
          <a className="lp-promo-link" href={href}>
            {linkText}&nbsp;→
          </a>
        </p>
        <button type="button" className="lp-promo-x" onClick={dismiss} aria-label="Dismiss announcement">
          <Icon name="x" size={16} color="currentColor" stroke={2.25} />
        </button>
      </div>
      <script dangerouslySetInnerHTML={{ __html: preflight }} />
    </>
  );
}
