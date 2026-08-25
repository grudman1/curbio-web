"use client";

import { useEffect, useState } from "react";
import { MARKETS } from "@/config/markets";

// The live-feed pill under the page heading.
//
// THE MOCKUP'S VERSION WAS FABRICATED — "Project 8,214 · Bethesda, MD —
// kitchen and paint, finished in 19 days" and three siblings, none of which
// correspond to a real project. Rotating invented project numbers past an
// agent is manufactured social proof, so this rotates REAL closings instead:
// neighborhood, market, and sale price straight out of config/markets.ts,
// which is already the source of truth for the campaign sold-proof strip.
//
// Listings flagged `unverified` (price is a Zestimate, not a confirmed sale)
// are skipped rather than shown with an asterisk — a rotating pill is the
// wrong surface for a caveat nobody will read.
//
// Under prefers-reduced-motion the pill renders one listing and never
// rotates; there is no version of an auto-advancing ticker that respects that
// preference.

const FEED = MARKETS.flatMap((m) =>
  m.sold
    .filter((s) => s.price && !s.unverified)
    .map((s) => ({ where: `${s.neighborhood}, ${m.state}`, price: s.price as string }))
);

const ROTATE_MS = 4200;
const FADE_MS = 400;

export function SoldTicker() {
  const [i, setI] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (FEED.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cycle = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setI((n) => (n + 1) % FEED.length);
        setFading(false);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => clearInterval(cycle);
  }, []);

  if (!FEED.length) return null;
  const item = FEED[i];

  return (
    // aria-live is deliberately absent: this rotates every four seconds and
    // announcing each change would talk over everything else on the page.
    <p className="c-ticker">
      <span className="c-ticker-dot" aria-hidden="true" />
      <span className={`c-ticker-text${fading ? " is-out" : ""}`}>
        Prepped and sold — {item.where} · {item.price}
      </span>
    </p>
  );
}
