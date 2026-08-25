"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

// Drag-to-compare before/after.
//
// The mockup used ONE image for both halves and faked "before" with a
// grayscale+brightness filter, which is a picture of a filter, not a
// transformation. This uses the real pair already in the repo — the same
// 6906 Deer Run shots the deal timeline shows.
//
// Accessibility, which the mockup got half-right: it had role="slider" and
// arrow keys, but no accessible value text and no Home/End. A slider whose
// value is announced as "50" tells a screen-reader user nothing, so
// aria-valuetext carries a sentence instead.
//
// Pointer events only (no separate touch path) — pointer capture means a drag
// that leaves the element still tracks, which the mockup's mousemove version
// dropped.

const STEP = 4;

export function BeforeAfterSlider({
  before,
  after,
  caption,
}: {
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  caption?: string;
}) {
  const [pct, setPct] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPct(Math.max(0, Math.min(100, next)));
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowLeft: pct - STEP,
      ArrowRight: pct + STEP,
      Home: 0,
      End: 100,
    };
    const next = map[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setPct(Math.max(0, Math.min(100, next)));
  };

  const shown = Math.round(pct);

  return (
    <figure className="c-ba-fig">
      <div
        ref={frameRef}
        className="c-ba"
        role="slider"
        tabIndex={0}
        aria-label="Before and after comparison"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-valuetext={`${shown}% of the finished photo is showing. Drag or use the arrow keys to compare.`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) setFromClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <Image src={before.src} alt={before.alt} fill sizes="100vw" style={{ objectFit: "cover" }} priority={false} />
        <div className="c-ba-clip" style={{ clipPath: `inset(0 0 0 ${pct}%)` }}>
          <Image src={after.src} alt={after.alt} fill sizes="100vw" style={{ objectFit: "cover" }} />
        </div>

        <span className="c-ba-pill c-ba-pill--before">Before</span>
        <span className="c-ba-pill c-ba-pill--after">After</span>

        <div className="c-ba-handle" style={{ left: `${pct}%` }} aria-hidden="true">
          <span className="c-ba-knob">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M14 6l-6 6 6 6" />
            </svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M10 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
      {caption && <figcaption className="c-ba-cap">{caption}</figcaption>}
    </figure>
  );
}
