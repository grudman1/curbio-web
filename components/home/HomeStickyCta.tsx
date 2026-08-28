"use client";

import { useCallback, useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// The homepage's sticky mobile CTA.
//
// A SECOND sticky bar, deliberately not components/sections/StickyCta: that
// one is a <Link> to another page at ≤760px and cannot be dismissed. This one
// scrolls to the hero's own form, appears at <880px per the brief, and closes.
//
// ── Three rules it obeys ────────────────────────────────────────────────────
//  1. Not before the hero has left. A CTA that covers content before anyone
//     has read a word is an interstitial, not an affordance — so it waits for
//     the hero section's bottom edge to pass the top of the viewport.
//  2. Not over the closer. The closer IS this button, full size; stacking a
//     small copy of a CTA over the big one is noise.
//  3. NEVER over the CookieYes banner. That banner is bottom-pinned at a
//     z-index far above anything this stylesheet sets, so "sit above it" is
//     not winnable and stacking near it produces a two-bar sandwich over the
//     content. It yields instead: while the consent banner is on screen this
//     bar is simply not rendered. Consent is a decision the visitor has to
//     make once; the CTA can wait the few seconds it takes.
//
// Dismissal is per-page-load, not persisted: nothing here is worth a cookie
// that then has to appear in a consent policy.
// ─────────────────────────────────────────────────────────────────────────────

/** CookieYes's bottom-pinned banner. Both selectors are theirs; the second is
 *  the older bar layout, kept because which one renders is a dashboard
 *  setting, not something this code controls. */
const CONSENT_SELECTOR = ".cky-consent-container, .cky-consent-bar";

function consentBannerVisible(): boolean {
  const el = document.querySelector<HTMLElement>(CONSENT_SELECTOR);
  if (!el) return false;
  // Present-but-hidden is the normal post-decision state — CookieYes leaves
  // the container in the DOM and hides it.
  const r = el.getBoundingClientRect();
  return r.height > 0 && r.bottom > 0 && getComputedStyle(el).visibility !== "hidden";
}

export function HomeStickyCta({
  href = "#get-estimate",
  label = "Get free estimate",
  /** The section this must not overlap — the page's own closer. */
  hideOver = ".c-closer",
}: {
  href?: string;
  label?: string;
  hideOver?: string;
}) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const hero = document.querySelector(".c-hero");
      const closer = document.querySelector(hideOver);
      const pastHero = hero
        ? hero.getBoundingClientRect().bottom <= 0
        : window.scrollY > window.innerHeight * 0.6;
      const overCloser = closer ? closer.getBoundingClientRect().top < window.innerHeight : false;
      setShow(pastHero && !overCloser && !consentBannerVisible());
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    // The consent banner arrives asynchronously (third-party script) and
    // leaves on a click that produces no scroll or resize, so neither event
    // is enough on its own. TWO NARROW OBSERVERS, not one broad one: a
    // {subtree, attributes} observer on <body> fires on every DOM write the
    // whole page makes — on a page this long that is a measurable amount of
    // main-thread work for one bottom bar. Instead:
    //   • body childList only (CookieYes injects its container as a direct
    //     child of <body>), to catch it arriving or being removed;
    //   • once it exists, its own attributes, to catch it being hidden.
    const mo = new MutationObserver(() => {
      attachBanner();
      onScroll();
    });
    mo.observe(document.body, { childList: true });

    const bannerMo = new MutationObserver(onScroll);
    let watched: Element | null = null;
    function attachBanner() {
      const el = document.querySelector(CONSENT_SELECTOR);
      if (el && el !== watched) {
        bannerMo.disconnect();
        bannerMo.observe(el, { attributes: true, attributeFilter: ["class", "style"] });
        watched = el;
      }
    }
    attachBanner();

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      mo.disconnect();
      bannerMo.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [hideOver, dismissed]);

  const onCta = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Scroll rather than navigate: the target is on this page, and a hash
    // navigation would leave "#get-estimate" in the address bar. The href
    // stays real so the control still works before hydration.
    e.preventDefault();
    document.querySelector("#get-estimate")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("c-zip")?.focus({ preventScroll: true });
  }, []);

  if (dismissed) return null;

  return (
    <div className={`c-mstick${show ? " is-shown" : ""}`} aria-hidden={!show}>
      <a className="c-cta c-mstick-cta" href={href} onClick={onCta} tabIndex={show ? undefined : -1}>
        {label}
      </a>
      <button
        className="c-mstick-x"
        type="button"
        onClick={() => setDismissed(true)}
        tabIndex={show ? undefined : -1}
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
