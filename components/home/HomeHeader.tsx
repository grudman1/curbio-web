"use client";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Homepage preview header.
//
// STRUCTURE
//   Logo · How It Works · Services ▾ · Our Work · Pay At Closing · phone · Log in
//
// The primary CTA is the address search bar IN THE HERO (see HomeHero), not
// anything in this bar — the header stays four questions an agent asks before
// they'll trust that field: how it works, what you do, is it any good, what
// it costs. No "Get a free estimate" button and no "Markets" item here; the
// hero field answers coverage directly. Everything else lives in the footer.
//
// Nav labels are hardcoded and the links are inert spans on purpose: every
// destination is a page that doesn't exist yet, and config/navigation.ts must
// not grow entries for pages nobody has built (the page registry would list
// them as planned work). They become real links as their targets are built.
//
// TONE: three states driven by what's behind the fixed bar — transparent over
// the hero, frosted light once scrolled, frosted dark over navy sections.
// Measured with getBoundingClientRect (viewport-relative) rather than scrollY:
// globals.css puts `overflow-x: hidden` on <body>, which makes "which element
// is actually scrolling" ambiguous across browsers. Rects sidestep that.
// ─────────────────────────────────────────────────────────────────────────────

type Tone = "hero" | "scrolled" | "dark";

const PHONE_DISPLAY = "(844) 944-2629";

const ICON: Record<string, React.ReactNode> = {
  refreshes: (
    <>
      <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
      <path d="M14.5 17.5 4.5 15" />
    </>
  ),
  remodels: (
    <>
      <path d="m15 12-8.4 8.4a1 1 0 1 1-3-3L12 9" />
      <path d="m18 15 4-4" />
      <path d="M21.5 11.5 19.6 9.6A2 2 0 0 1 19 8.2V7l-2.3-2.3a6 6 0 0 0-4.2-1.7L9 3l.9.8A6.2 6.2 0 0 1 12 8.4V10l2 2h1.2a2 2 0 0 1 1.4.6l1.9 1.9" />
    </>
  ),
  repairs: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  listing: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  inspection: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  staging: (
    <>
      <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
      <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z" />
      <path d="M4 18v2" />
      <path d="M20 18v2" />
    </>
  ),
};

function Item({ name, title, desc }: { name: string; title: string; desc: string }) {
  return (
    <span className="dph-item">
      <span className="dph-disc">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          {ICON[name]}
        </svg>
      </span>
      <span className="dph-item-text">
        <span className="dph-item-title">{title}</span>
        <span className="dph-item-desc">{desc}</span>
      </span>
    </span>
  );
}

export function HomeHeader() {
  const [tone, setTone] = useState<Tone>("hero");

  useEffect(() => {
    const header = document.getElementById("dp-header");
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (!header) return;

    const update = () => {
      const rect = header.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;

      const overDark = Array.from(document.querySelectorAll<HTMLElement>("[data-dark]")).some((el) => {
        const r = el.getBoundingClientRect();
        return mid >= r.top && mid <= r.bottom;
      });
      if (overDark) return setTone("dark");

      const heroBottom = hero ? hero.getBoundingClientRect().bottom : 700;
      setTone(heroBottom <= rect.bottom ? "scrolled" : "hero");
    };

    update();
    // Capture phase, so it fires whether the document or a nested element is
    // the thing scrolling (scroll events don't bubble, but they do capture).
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <header id="dp-header" data-tone={tone}>
      <div className="dph-announce">
        <b>Pay at closing</b> — your seller pays nothing until the home sells.
        <u>How it works →</u>
      </div>

      <div className="dph-bar">
        <div className="dph-scrim" aria-hidden />
        <nav className="dph-nav">
          <span className="dph-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="dph-logo-white" src="/logo/curbio-white.svg" alt="Curbio" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="dph-logo-navy" src="/logo/curbio-navy.svg" alt="" aria-hidden />
          </span>

          <ul className="dph-links">
            <li>
              <span className="dph-link">How It Works</span>
            </li>

            <li>
              <span className="dph-link has-drop">Services</span>
              <div className="dph-drop">
                <p className="dph-drop-head">What we take on</p>
                <div className="dph-grid">
                  <Item name="refreshes" title="Refreshes" desc="Paint, floors, fixtures, punch-out" />
                  <Item name="remodels" title="Remodels" desc="Kitchens and baths, to the studs" />
                  <Item name="repairs" title="Repairs" desc="Roofs, systems, structure" />
                  <Item name="listing" title="Listing prep" desc="Everything before the photographer" />
                  <Item name="inspection" title="Inspection repairs" desc="The addendum, closed out" />
                  <Item name="staging" title="Staging" desc="Styled and photo-ready" />
                </div>
                <div className="dph-drop-foot">
                  <span className="dph-foot-label">By room</span>
                  <span className="dph-foot-link">Kitchens</span>
                  <span className="dph-foot-link">Bathrooms</span>
                  <span className="dph-foot-link">Exteriors</span>
                </div>
              </div>
            </li>

            <li>
              <span className="dph-link">Our Work</span>
            </li>

            <li>
              <span className="dph-link">Pay At Closing</span>
            </li>
          </ul>

          <div className="dph-actions">
            <span className="dph-phone">
              <svg viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{PHONE_DISPLAY}</span>
            </span>

            <span className="dph-login">Log in</span>

            <button className="dph-burger" type="button" aria-label="Menu">
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
