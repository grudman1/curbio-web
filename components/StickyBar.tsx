"use client";

import { useState, useEffect, useCallback } from "react";
import { track } from "@vercel/analytics";
import { Icon } from "./LpKit";
import { gaEvent } from "@/lib/analytics";
import { readVariantFromCookie } from "@/lib/ctaVariant";

export function StickyBar({ ctaCopy, marketSlug }: { ctaCopy: string; marketSlug?: string }) {
  const [show, setShow] = useState(false);

  const handleCta = useCallback(() => {
    const params = { cta_id: "sticky_bar", market: marketSlug || "unknown", variant: readVariantFromCookie() };
    gaEvent("cta_click", params);
    track("cta_click", params);
    const el = document.getElementById("quote-form");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    window.setTimeout(
      () => document.getElementById("fc-name")?.focus({ preventScroll: true }),
      reduce ? 0 : 480
    );
  }, [marketSlug]);

  useEffect(() => {
    const form = document.getElementById("quote-form");
    if (!form) return;
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(form);
    return () => io.disconnect();
  }, []);

  return (
    <div className={"lp-sticky" + (show ? " show" : "")} aria-hidden={!show}>
      <div className="lp-shell lp-sticky-inner">
        <span className="lp-sticky-txt">Your seller pays nothing until the home sells.</span>
        <button className="lp-sticky-cta" onClick={handleCta} tabIndex={show ? 0 : -1}>
          {ctaCopy}
          <Icon name="arrow" size={17} color="currentColor" />
        </button>
      </div>
    </div>
  );
}
