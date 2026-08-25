"use client";

import { useEffect, useRef, useState } from "react";

// FAQ accordion.
//
// Built on <details>-style semantics without <details>, because the panel is
// height-animated and Safari still cannot animate a native disclosure open.
// What it keeps from the native element: the button is the control, it owns
// aria-expanded, and it points at the panel with aria-controls.
//
// HEIGHT ANIMATION, and why it is not the grid trick. `grid-template-rows:
// 0fr → 1fr` is the fashionable way to animate to auto height, and it does not
// work here: the panel's inner element needs `overflow: hidden` to clip while
// closed, and that zeroes its min-content contribution, so `1fr` resolves
// against no free space and collapses to 0. Measured in the browser — open
// state computed to 0px with the rule correctly applied.
//
// So this measures, like the mockup did, but with a ResizeObserver instead of
// a one-shot scrollHeight read on click. That keeps the open height correct
// when the viewport changes, when a webfont finishes loading, or when the
// answer text reflows — all cases where the mockup's cached pixel value went
// stale and clipped the answer.
//
// Panels stay in the DOM (never `display: none`), so find-in-page and crawlers
// still see every answer.

export type FaqItem = { q: string; a: React.ReactNode };

export function Faq({ items, idPrefix = "faq" }: { items: FaqItem[]; idPrefix?: string }) {
  // Multiple panels may be open at once — an accordion that closes the answer
  // you just read to show another one is a worse reading experience.
  const [open, setOpen] = useState<Set<number>>(new Set());
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Publish each answer's natural height as a custom property on its panel.
  // The panel transitions between 0 and that value.
  useEffect(() => {
    const observers = innerRefs.current.map((inner) => {
      if (!inner) return null;
      const panel = inner.parentElement;
      if (!panel) return null;
      const sync = () => panel.style.setProperty("--c-faq-h", `${inner.scrollHeight}px`);
      sync();
      const ro = new ResizeObserver(sync);
      ro.observe(inner);
      return ro;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, [items.length]);

  const toggle = (i: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="c-faq">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <div key={item.q} className={`c-faq-item${isOpen ? " is-open" : ""}`}>
            <h3 className="c-faq-h">
              <button
                type="button"
                className="c-faq-q"
                aria-expanded={isOpen}
                aria-controls={`${idPrefix}-panel-${i}`}
                id={`${idPrefix}-q-${i}`}
                onClick={() => toggle(i)}
              >
                {item.q}
                <span className="c-faq-chevron" aria-hidden="true" />
              </button>
            </h3>
            <div
              className="c-faq-panel"
              id={`${idPrefix}-panel-${i}`}
              role="region"
              aria-labelledby={`${idPrefix}-q-${i}`}
            >
              <div
                className="c-faq-panel-inner"
                ref={(el) => {
                  innerRefs.current[i] = el;
                }}
              >
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
