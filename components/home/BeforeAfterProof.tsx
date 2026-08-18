"use client";

import { useEffect, useRef, useState } from "react";

// "Real projects" — the before/after transformation clip (Gavin, Aug 9).
// Ported from the landing page's lp-proof section, rebuilt on the dp- design
// system.
//
// Redesigned light (Gavin, Aug 17): the navy surface sat between two
// near-white sections (HowItWorks default, HomeResults raised) and read as a
// heavy interruption rather than a beat. Stone now gives it the separation
// navy used to, without the section-order effect. `data-dark` comes off the
// <section> with it — that attribute is what tells HomeHeader.tsx to swap
// into its frosted-navy tone, and this section no longer qualifies.
//
// WHY THIS IS A CLIENT COMPONENT. An autoplaying loop is a motion source, and
// `autoplay` is an ATTRIBUTE — it cannot be turned off by a media query the
// way an animation can. So reduced-motion has to be read in JS and the
// attribute withheld. When it is withheld the poster shows and native controls
// appear, so the clip is still watchable on purpose rather than simply gone.
//
// It also pauses when scrolled out of view. An 8-second 24fps loop that never
// stops is a real battery and data cost on a page this long, and nobody is
// watching it from three sections away.
//
// The clip is 1000x828 (~6:5). The frame is sized by aspect-ratio rather than
// a fixed height so it never letterboxes, and object-fit:cover absorbs the
// rounding at the edges.

const POINTS = [
  {
    text: "Design, materials & full project management — handled",
    icon: (
      <>
        <path d="M9 3.5h6a1 1 0 0 1 1 1V5h1.5A1.5 1.5 0 0 1 19 6.5v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-13A1.5 1.5 0 0 1 6.5 5H8v-.5a1 1 0 0 1 1-1Z" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </>
    ),
  },
  {
    text: "On time, on budget, overseen by your local expert",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  {
    text: "$0 out of pocket — your seller pays at close",
    icon: (
      <>
        <path d="M12 4v16" />
        <path d="M16 7.5c0-1.5-1.8-2.5-4-2.5s-4 1-4 2.5c0 1.4 1.4 2 4 2.6 2.6.6 4 1.2 4 2.6 0 1.5-1.8 2.5-4 2.5s-4-1-4-2.5" />
      </>
    ),
  },
];

export function BeforeAfterProof() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Pause offscreen. Skipped entirely under reduced motion, where playback is
  // the visitor's decision and we must not override it.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section className="dp-proofvid" aria-labelledby="proofvid-h">
      <div className="dp-container dp-proofvid-grid">
        <div className="dp-proofvid-copy">
          <p className="dp-eyebrow dp-proofvid-eyebrow">Real projects</p>
          <h2 className="dp-proofvid-h" id="proofvid-h">
            After 8,000 projects, we&rsquo;ve gotten pretty good at{" "}
            <span className="dp-proofvid-h-accent">before-and-afters.</span>
          </h2>
          <span className="dp-proofvid-rule" aria-hidden="true" />
          <p className="dp-proofvid-sub">
            Today&rsquo;s buyers scroll past tired listings. Watch an outdated space become
            move-in ready &mdash; the kind of home that wins showings, draws offers, and sells
            for more, without your seller writing a check before closing.
          </p>
          <ul className="dp-proofvid-points">
            {POINTS.map((p) => (
              <li key={p.text}>
                <span className="dp-proofvid-point-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {p.icon}
                  </svg>
                </span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <figure className="dp-proofvid-fig">
          <div className="dp-proofvid-frame">
            <video
              ref={videoRef}
              // Under reduced motion: no autoplay, no loop, controls shown.
              autoPlay={!reduced}
              loop={!reduced}
              controls={reduced}
              muted
              playsInline
              preload="metadata"
              poster="/proof/before-after-poster.jpg"
              aria-label="A kitchen before and after a Curbio pre-listing renovation"
            >
              <source src="/proof/before-after.webm" type="video/webm" />
              <source src="/proof/before-after.mp4" type="video/mp4" />
            </video>
            <span className="dp-proofvid-tag">
              Before
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
              After
            </span>
          </div>
          <figcaption>A real Curbio transformation, start to finish.</figcaption>
        </figure>
      </div>
    </section>
  );
}
