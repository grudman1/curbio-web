"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/events";

const THRESHOLDS = [25, 50, 75, 100] as const;

/**
 * Fires `scroll_depth` once per threshold per page view.
 *
 * Deliberately simple and deliberately throttled to animation frames: a
 * scroll listener is the easiest way to make a page feel janky, and these are
 * conversion pages. Passive listener, no layout reads outside the rAF, and it
 * detaches itself once 100% has fired so long pages stop paying for it.
 *
 * Thresholds are per-mount, so a client-side navigation to another page starts
 * fresh — otherwise a visitor who scrolled the landing page would never record
 * depth on /confirm.
 */
export function ScrollDepth() {
  useEffect(() => {
    const fired = new Set<number>();
    let frame = 0;

    function measure() {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      // Pages shorter than the viewport are 100% visible on load. Recording
      // that as a scroll would overstate engagement, so they record nothing.
      if (scrollable <= 0) return;
      const pct = ((window.scrollY / scrollable) * 100);

      for (const t of THRESHOLDS) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          trackEvent("scroll_depth", { depth: t });
        }
      }
      if (fired.size === THRESHOLDS.length) {
        window.removeEventListener("scroll", onScroll);
      }
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
