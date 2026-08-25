"use client";

import { useCallback, useEffect, useRef } from "react";

// The services carousel — auto-scrolling, and draggable (Gavin, Aug 8).
//
// WHY THIS IS NOW JS AND NOT A CSS ANIMATION. The old version translated the
// track with @keyframes, which cannot be dragged: a transform and a user's
// finger are two different sources of truth for the same position, and they
// fight. Driving native scrollLeft instead means the auto-advance, a drag, a
// trackpad swipe, a touch flick and a shift+wheel are all the same value —
// so the carousel became draggable by changing what moves it, not by adding
// gesture handling on top of the animation.
//
// The seamless loop still works the way it did: the row is rendered TWICE and
// the position wraps by subtracting one copy's width, which is pixel-identical
// to where it started. The second copy stays aria-hidden.
//
// SPEED is px/second, not a duration, so it no longer changes when cards are
// added or removed — the old 64s/91s duration had to be re-tuned by hand every
// time the card count changed.
//
// Pauses on hover and while dragging. Under prefers-reduced-motion it does not
// auto-advance at all — but it stays scrollable and draggable, so the content
// is still reachable.

// 2x the previous 48 (Gavin, Aug 8). One copy of the row is ~2,330px, so a
// full pass now takes ~24s instead of ~49s.
const SPEED_PX_PER_SEC = 96;

export function ServicesMarquee({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);

  // Keep the position inside [0, oneCopy) so the loop never runs out of track.
  const wrap = useCallback(() => {
    const el = scrollerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const oneCopy = track.scrollWidth / 2;
    if (oneCopy <= 0) return;
    if (el.scrollLeft >= oneCopy) el.scrollLeft -= oneCopy;
    else if (el.scrollLeft <= 0) el.scrollLeft += oneCopy;
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = 0;
    // Sub-pixel remainder — scrollLeft is integer-ish, so without this the
    // carousel would crawl in visible 1px steps at low speeds.
    let carry = 0;

    const tick = (t: number) => {
      if (!last) last = t;
      const dt = Math.min(t - last, 100) / 1000; // clamp: tab-switch gaps
      last = t;
      if (!pausedRef.current && !draggingRef.current && !reduced.matches) {
        carry += SPEED_PX_PER_SEC * dt;
        const step = Math.floor(carry);
        if (step > 0) {
          carry -= step;
          el.scrollLeft += step;
          wrap();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wrap]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Let the browser keep native touch scrolling; only take over for mouse
    // and pen, where there is no built-in drag-to-scroll.
    if (e.pointerType === "touch") return;
    const el = scrollerRef.current;
    if (!el) return;
    draggingRef.current = true;
    dragMovedRef.current = false;
    startXRef.current = e.clientX;
    startScrollRef.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 3) dragMovedRef.current = true;
    el.scrollLeft = startScrollRef.current - dx;
    wrap();
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    scrollerRef.current?.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      ref={scrollerRef}
      className="cr-marquee"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onScroll={wrap}
      // A drag that moved should not also fire the click on whatever card it
      // finished over.
      onClickCapture={(e) => {
        if (dragMovedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          dragMovedRef.current = false;
        }
      }}
    >
      <div ref={trackRef} className="cr-track">
        {children}
      </div>
    </div>
  );
}
