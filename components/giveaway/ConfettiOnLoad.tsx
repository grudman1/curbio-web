"use client";

import { useEffect } from "react";
import { useGiveaway } from "./GiveawayShell";

// The opening burst, once. Renders nothing: the canvas is created, and removed,
// by confetti.ts, outside React's tree.
//
// "Once" means once per page LOAD. The flag lives at module level so that
// React remounting this component — Strict Mode in development, a client-side
// route change back to the page — cannot fire it a second time, while a real
// reload still can.
//
// Not on a page whose entry period is over: "the giveaway has closed" is not
// something to throw confetti at. The short delay lets the page paint and the
// form hydrate first; the module itself is fetched only here, so it costs the
// first paint nothing.

let fired = false;

export function ConfettiOnLoad() {
  const { closed } = useGiveaway();

  useEffect(() => {
    if (closed || fired) return;
    const timer = window.setTimeout(() => {
      if (fired) return;
      fired = true;
      import("./confetti")
        .then((m) => m.fireWelcome())
        .catch(() => {
          // A failed chunk load is a missing decoration, nothing more.
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [closed]);

  return null;
}
