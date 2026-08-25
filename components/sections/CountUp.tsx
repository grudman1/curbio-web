"use client";

import { useEffect, useRef, useState } from "react";

// A figure that dials up from 0 to its value when it scrolls into view.
//
// SSR RENDERS THE FINAL NUMBER, not 0. Crawlers and no-JS visitors get "94%",
// which is the actual claim; the reset to 0 happens on mount, in an effect, so
// the animated version is a progressive enhancement rather than the source of
// truth. In practice the reset is never seen — every consumer of this sits far
// enough down the page that it is offscreen at hydration, and the observer
// only starts the count once it isn't.
//
// prefers-reduced-motion: reduce skips the whole thing and leaves the final
// value in place. The animated span is aria-hidden with a static sr-only twin
// beside it, so assistive tech is told the number once instead of being
// updated sixty times a second.

const DURATION_MS = 1100;

/** Fast out of the gate, settling into the final value. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  /** Rendered before the figure — e.g. "~" or "$". */
  prefix?: string;
  /** Rendered after the figure — e.g. "%". */
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Bail BEFORE zeroing if there is no observer to start the count again —
    // a stuck "0%" is a false claim on the page, which is worse than no
    // animation at all.
    if (typeof IntersectionObserver === "undefined") return;

    setDisplay(0);

    let raf = 0;
    let startedAt = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // One-shot: counting again on every scroll-by would turn a flourish
        // into a fidget.
        observer.disconnect();
        const step = (now: number) => {
          if (!startedAt) startedAt = now;
          const progress = Math.min((now - startedAt) / DURATION_MS, 1);
          setDisplay(value * easeOut(progress));
          if (progress < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      // Waits until the card is properly on screen rather than firing on the
      // first pixel, so the count is watched rather than missed.
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  const format = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <span ref={ref}>
      <span aria-hidden="true">
        {prefix}
        {format(display)}
        {suffix}
      </span>
      <span className="c-sr-only">
        {prefix}
        {format(value)}
        {suffix}
      </span>
    </span>
  );
}
