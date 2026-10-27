"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Plays a CSS-animated illustration's entrance when it is actually SEEN.
 *
 * CSS animations start at first paint. That is right when the illustration is
 * on screen at load (desktop hero), and wrong when it is below the fold (the
 * phone layout puts the hero visual under the form): the entrance would play
 * to nobody and the visitor would scroll down to the finished still.
 *
 * So: if the element is at least a third visible when this mounts, nothing
 * happens — the paint-time animation is already playing in view. Otherwise
 * the animations are switched off (`data-armed`, see globals.css; the resting
 * state shows, off screen) and the moment it scrolls a third into view the
 * children are re-mounted, which restarts every animation from its first
 * frame. Without JavaScript the paint-time animation simply runs and ends on
 * the resting state, so nothing is ever left half-drawn.
 */
export function PlayWhenSeen({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const SEEN = 0.35;
    let waiting = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= SEEN) {
          if (waiting) {
            setArmed(false);
            setRun((r) => r + 1);
          }
          io.disconnect();
        } else if (!waiting) {
          waiting = true;
          setArmed(true);
        }
      },
      { threshold: [0, SEEN] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-armed={armed ? "" : undefined}>
      <div key={run}>{children}</div>
    </div>
  );
}
