"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Before/after reveal slider — 3 Paul Revere Rd kitchen.
//
// The AFTER image is the base layer and the BEFORE is clipped over it, so the
// finished kitchen is what paints first and what `priority` is spent on. That
// ordering is the point: the after shot is the LCP element, and the before is
// decoration until someone drags.
//
// ── INTERACTION, and why it is pointer events ───────────────────────────────
// One code path for mouse, touch, and pen. The split that matters is WHERE a
// drag may start:
//
//   handle    always draggable, any input type. `touch-action: none` is set on
//             the handle ONLY, so a finger on the handle moves the slider.
//   surface   mouse only. Click-anywhere-to-jump is good on a desktop and
//             actively hostile on a phone: the slider is ~45% of the viewport
//             on mobile, and swallowing touch there would eat vertical page
//             scroll over half the hero. So a finger on the photo scrolls the
//             page, exactly as it would over any other image.
//
// setPointerCapture keeps move events coming to the handle once a drag starts,
// so dragging past the edge of the frame (or off the window) still tracks and
// still releases cleanly.
//
// ── KEYBOARD ────────────────────────────────────────────────────────────────
// role="slider" with real semantics: arrows step 2%, shift+arrow and PageUp/Dn
// step 10%, Home/End slam to the ends. aria-valuetext says "60% after" rather
// than a bare number, because "60" alone tells a screen-reader user nothing
// about which direction is which.
// ─────────────────────────────────────────────────────────────────────────────

const IMAGES = {
  // Both files live in /public/home/hero/. The AFTER shot is the LCP element.
  after: {
    src: "/home/hero/paul-revere-kitchen-after.jpg",
    alt: "3 Paul Revere Road kitchen after Curbio's pre-listing renovation: white shaker cabinets, quartz island, subway tile, and new flooring",
  },
  before: {
    src: "/home/hero/paul-revere-kitchen-before.jpg",
    alt: "The same kitchen before renovation: dated wood cabinets, laminate counters, and patterned vinyl flooring",
  },
};

/** Opening position. 40 puts the divider at 40%, so 60% of the frame is the
 *  finished kitchen — the hero should lead with the result, not the problem. */
const DEFAULT_POS = 40;
const STEP = 2;
const BIG_STEP = 10;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function BeforeAfterSlider() {
  const [pos, setPos] = useState(DEFAULT_POS);
  // Two representations of the same fact, on purpose. The REF is the one the
  // move handler reads: React batches state, so a pointermove arriving in the
  // same tick as its pointerdown would see `dragging === false` and drop the
  // first slice of the gesture. The STATE exists only to put data-dragging on
  // the frame, which is styling and can lag a render harmlessly.
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback(() => {
    draggingRef.current = true;
    setDragging(true);
  }, []);
  const endDrag = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
  }, []);

  /** Clientspace X → percentage across the frame. */
  const posFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return DEFAULT_POS;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return DEFAULT_POS;
    return clamp(((clientX - r.left) / r.width) * 100);
  }, []);

  // Drag lifecycle lives on the handle via pointer capture, so these listeners
  // are only needed for the mouse-on-surface path (capture is not set there).
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => setPos(posFromClientX(e.clientX));
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, posFromClientX, endDrag]);

  // Mouse only — see the note above on why touch must not start a drag here.
  const onSurfacePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setPos(posFromClientX(e.clientX));
    startDrag();
  };

  const onHandlePointerDown = (e: React.PointerEvent) => {
    // Stop the surface handler from also firing: it jumps the divider to the
    // pointer, so grabbing the handle near its edge would snap the seam a few
    // px before the drag even started.
    e.stopPropagation();
    // Focus explicitly. setPointerCapture suppresses the native click-to-focus
    // on the button, so without this a visitor who DRAGS the handle and then
    // reaches for the arrow keys gets nothing — the keypress goes to the
    // document and scrolls the page instead. Verified: this is the difference
    // between arrows moving the seam and arrows scrolling.
    e.currentTarget.focus();
    // Capture keeps move events coming here once the pointer leaves the handle.
    // Guarded: it throws InvalidPointerId if the pointer is no longer active,
    // and a failed capture must not cost the drag — the window-level listeners
    // below already handle the uncaptured case.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture unavailable; window listeners still track the drag */
    }
    startDrag();
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return; // ref, not state — see the note above
    setPos(posFromClientX(e.clientX));
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const big = e.shiftKey;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = pos - (big ? BIG_STEP : STEP);
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = pos + (big ? BIG_STEP : STEP);
        break;
      case "PageDown":
        next = pos - BIG_STEP;
        break;
      case "PageUp":
        next = pos + BIG_STEP;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    e.preventDefault(); // arrows would otherwise scroll the page
    setPos(clamp(next));
  };

  const afterPct = Math.round(100 - pos);

  return (
    <div
      ref={frameRef}
      className="dp-ba"
      data-dragging={dragging || undefined}
      onPointerDown={onSurfacePointerDown}
    >
      {/* AFTER — base layer, full frame, and the LCP element. */}
      <Image
        src={IMAGES.after.src}
        alt={IMAGES.after.alt}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 560px"
        className="dp-ba-img"
      />

      {/* BEFORE — clipped to the left of the divider. aria-hidden: the visible
          truth of this frame is the after shot, and announcing both images
          back to back describes one kitchen twice. The after alt carries the
          meaning; the slider's own label explains what dragging does. */}
      <div className="dp-ba-clip" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} aria-hidden="true">
        <Image
          src={IMAGES.before.src}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 560px"
          className="dp-ba-img"
        />
      </div>

      <span className="dp-ba-tag dp-ba-tag--before" aria-hidden="true">Before</span>
      <span className="dp-ba-tag dp-ba-tag--after" aria-hidden="true">After</span>

      {/* The divider rides the same percentage as the clip, so the line always
          sits exactly on the seam. */}
      <div className="dp-ba-divider" style={{ left: `${pos}%` }} aria-hidden="true" />

      <button
        type="button"
        className="dp-ba-handle"
        style={{ left: `${pos}%` }}
        role="slider"
        aria-label="Reveal more of the before or after photo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${afterPct}% after, ${Math.round(pos)}% before`}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
        onKeyDown={onKeyDown}
      >
        {/* Two chevrons, out from the centre — the universal "drag me sideways"
            mark. Stroked, not filled, to match the Lucide line icons the design
            system already uses. */}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.5 8 7 12l3.5 4" />
          <path d="M13.5 8 17 12l-3.5 4" />
        </svg>
      </button>
    </div>
  );
}
