"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// The step narrative: a sticky numbered rail beside alternating step cards.
//
// Improvements on the mockup this is built from:
//
//   • THE RAIL IS BUTTONS, not <li> elements with click handlers. The mockup's
//     rail was mouse-only — no keyboard focus, no role, nothing announced.
//   • ACTIVE STATE COMES FROM IntersectionObserver, not a scroll handler that
//     measures every step's bounding box on every event.
//   • REVEAL DEFAULTS TO VISIBLE. The mockup set opacity:0 in CSS and removed
//     it from JS, so a failed bundle left the entire page invisible. Here the
//     hiding class is added by JS, so no-JS and broken-JS both render content.
//   • Step images are local and next/image-optimised; the mockup hot-linked
//     full-size WordPress uploads.

export type RailStep = {
  id: string;
  /** "01" — display only; the rail derives its own numbering from order. */
  num: string;
  /** Short label for the rail. */
  rail: string;
  /** When this happens — "Day 1", "Within 48 hours". */
  when: string;
  title: string;
  body: React.ReactNode;
  tags: string[];
  link?: { href: string; label: string };
  media: { src: string; alt: string };
  /** Small overlapping second image, bottom-right of the frame. */
  inset?: { src: string; alt: string };
};

export function StepRail({ steps }: { steps: RailStep[] }) {
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [animate, setAnimate] = useState(false);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) setAnimate(true);

    const nodes = stepRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    // rootMargin pulls the trip line to roughly the upper third of the
    // viewport, so a step becomes "current" as you arrive at it rather than
    // when its last pixel clears the bottom.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = nodes.indexOf(entry.target as HTMLElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));

    // A SECOND observer, wider and one-way: once a step has been on screen it
    // stays revealed. Sharing the narrow observer above would re-hide every
    // step the moment it left the active band.
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = nodes.indexOf(entry.target as HTMLElement);
          if (index < 0) continue;
          setSeen((current) => (current.has(index) ? current : new Set(current).add(index)));
          reveal.unobserve(entry.target);
        }
      },
      { threshold: 0.12 }
    );
    nodes.forEach((n) => reveal.observe(n));

    return () => {
      observer.disconnect();
      reveal.disconnect();
    };
  }, [steps.length]);

  const goTo = (i: number) => {
    const el = stepRefs.current[i];
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  };

  return (
    <div className="c-steps-grid">
      <aside className="c-rail" aria-label="Steps on this page">
        <p className="c-eyebrow">{steps.length} steps</p>
        <ol className="c-rail-list">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={`c-rail-item${i === active ? " is-on" : ""}${i < active ? " is-done" : ""}`}
            >
              <button type="button" onClick={() => goTo(i)} aria-current={i === active ? "step" : undefined}>
                <span className="c-rail-dot" aria-hidden="true">
                  {i + 1}
                </span>
                {s.rail}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <div>
        {steps.map((s, i) => (
          <article
            key={s.id}
            id={s.id}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className={
              `c-step${animate ? " c-step--animate" : ""}` +
              `${i === active ? " is-current" : ""}${seen.has(i) ? " is-seen" : ""}`
            }
          >
            <div className="c-step-copy">
              <p className="c-step-n">
                <b>{s.num}</b> {s.when}
              </p>
              <h3 className="c-step-title">{s.title}</h3>
              <p className="c-step-body">{s.body}</p>
              <ul className="c-step-tags">
                {s.tags.map((t) => (
                  <li key={t} className="c-tag">
                    {t}
                  </li>
                ))}
              </ul>
              {s.link && (
                <Link className="c-step-link" href={s.link.href}>
                  {s.link.label} <span aria-hidden="true">&rarr;</span>
                </Link>
              )}
            </div>

            <div className="c-step-media">
              <div className="c-step-frame">
                <Image
                  src={s.media.src}
                  alt={s.media.alt}
                  fill
                  sizes="(max-width: 1000px) 90vw, 45vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              {s.inset && (
                <div className="c-step-inset">
                  <Image
                    src={s.inset.src}
                    alt={s.inset.alt}
                    fill
                    sizes="18vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
