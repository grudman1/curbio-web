"use client";

import { useEffect, useState } from "react";

// Reading-progress bar, pinned under the site header.
//
// rAF-throttled rather than writing a style on every scroll event: scroll
// fires far faster than the screen repaints, and the mockup's version did a
// layout read plus a style write on each one.
//
// aria-hidden and role-free on purpose — progress through a document is a
// visual affordance, not information a screen reader needs announced. It is
// also skipped entirely under prefers-reduced-motion, where a bar that tracks
// the scroll is exactly the kind of continuous movement being opted out of.

export function ScrollProgress() {
  const [pct, setPct] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnabled(true);

    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      setPct(scrollable <= 0 ? 0 : (el.scrollTop / scrollable) * 100);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div className="c-progress" aria-hidden="true">
      <span className="c-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
