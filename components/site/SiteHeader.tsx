"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVIGATION, isGroup, itemIsCurrent, type NavItem } from "@/config/navigation";
import { MobileNav } from "./MobileNav";

// ─────────────────────────────────────────────────────────────────────────────
// Global site header — the approved homepage design (formerly HomeHeader),
// now rendering config/navigation.ts.
//
// STRUCTURE
//   Logo · How It Works · Services · Our Work · For Brokerages · Contact ·
//   phone · Log in · [Free Estimate]
//
// Labels, hrefs and order come from NAVIGATION — never hardcode a link here.
// ONE sanctioned exception: "Our Work" is a visible-but-INERT span, hardcoded
// below, because no route exists and adding it to config/navigation.ts would
// make the page registry list it as planned work. It becomes a real config
// entry the day the page is built.
//
// TONE: three states driven by what's behind the fixed bar — transparent over
// a hero, frosted light once scrolled, frosted dark over navy ([data-dark])
// sections. Measured with getBoundingClientRect (viewport-relative) rather
// than scrollY: globals.css puts `overflow-x: hidden` on <body>, which makes
// "which element is actually scrolling" ambiguous across browsers. Rects
// sidestep that. Pages without a dark hero simply sit in "scrolled" (frosted
// light) the whole time, which is the correct default chrome.
//
// The bar is FIXED, so the gold CTA is sticky by construction — the primary
// action never disappears on scroll.
// ─────────────────────────────────────────────────────────────────────────────

type Tone = "scrolled" | "dark";

const PHONE_DISPLAY = "(844) 944-2629";
const PHONE_TEL = "+18449442629";

export function SiteHeader() {
  const [tone, setTone] = useState<Tone>("scrolled");
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const showAnnouncement = pathname !== "/" && pathname !== "/home-preview";
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const header = document.getElementById("c-header");
    if (!header) return;

    const update = () => {
      const rect = header.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;

      const overDark = Array.from(document.querySelectorAll<HTMLElement>("[data-dark]")).some((el) => {
        const r = el.getBoundingClientRect();
        return mid >= r.top && mid <= r.bottom;
      });
      setTone(overDark ? "dark" : "scrolled");
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
  }, [pathname]);

  return (
    <header id="c-header" data-tone={tone}>
      {/* Skip link — first focusable element on the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-overlay focus:rounded-md focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-content"
      >
        Skip to content
      </a>

      {showAnnouncement && (
        <div className="ch-announce">
          <b>Pay at closing</b> — your seller pays nothing until the home sells.
          {/* Points at Notable's application, not our own /how-it-works page:
              the banner is about the pay-at-closing FINANCING, and Notable is
              the lender that underwrites it. External, so it opens in a new tab
              and keeps the visitor's place on the site. */}
          <a
            href="https://notablehome.com/curbio/apply"
            target="_blank"
            rel="noopener noreferrer"
          >
            <u>How it works →</u>
          </a>
        </div>
      )}

      <div className="ch-bar">
        <div className="ch-scrim" aria-hidden />
        <nav className="ch-nav" aria-label="Primary">
          <Link href="/" aria-label="Curbio — home" className="ch-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ch-logo-white" src="/logo/curbio-white.svg" alt="Curbio" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ch-logo-navy" src="/logo/curbio-navy.svg" alt="" aria-hidden />
          </Link>

          <ul className="ch-links">
            {NAVIGATION.primary.map((item) => (
              <DesktopItem key={item.label} item={item} pathname={pathname} />
            ))}
          </ul>

          <div className="ch-actions">
            <a className="ch-phone" href={`tel:${PHONE_TEL}`}>
              <svg viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{PHONE_DISPLAY}</span>
            </a>

            {/* Inert on purpose: the agent login lives on app.curbio.com and the
                destination hasn't been decided for the new site. */}
            <span className="ch-login">Log in</span>

            {/* The bar is fixed, so this button is the "sticky on scroll" CTA. */}
            <Link className="ch-cta" href={NAVIGATION.cta.href}>
              {NAVIGATION.cta.label}
            </Link>

            <button
              ref={triggerRef}
              className="ch-burger"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label="Open navigation menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>
      </div>

      <div id="mobile-nav">
        <MobileNav
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          navigation={NAVIGATION}
          pathname={pathname}
          triggerRef={triggerRef}
        />
      </div>
    </header>
  );
}

/**
 * One desktop nav item. The current IA is all flat links; the dropdown branch
 * stays because the config types allow it and the components must render
 * whatever shape they are given.
 *
 * The inert "Our Work" span renders after "Services" — the one hardcoded nav
 * label in the codebase (see the file comment for why it can't live in config).
 */
function DesktopItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const current = itemIsCurrent(item, pathname);

  if (item.kind === "link") {
    return (
      <>
        <li>
          <Link
            className="ch-link"
            href={item.href}
            aria-current={current ? "page" : undefined}
          >
            {item.label}
          </Link>
        </li>
        {item.href === "/services" && (
          <li>
            {/* Inert until an Our Work page exists — kept out of config so the
                page registry doesn't list it as planned work. */}
            <span className="ch-link">Our Work</span>
          </li>
        )}
      </>
    );
  }

  return (
    <li>
      <span className="ch-link has-drop">{item.label}</span>
      <div className="ch-drop">
        <div className="ch-grid" style={{ gridTemplateColumns: "1fr" }}>
          {item.children.map((child) =>
            isGroup(child) ? (
              <div key={child.label}>
                <p className="ch-drop-head">{child.label}</p>
                {child.items.map((link) => (
                  <Link key={link.href} className="ch-item" href={link.href}>
                    <span className="ch-item-text">
                      <span className="ch-item-title">{link.label}</span>
                      {link.description && <span className="ch-item-desc">{link.description}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={child.href} className="ch-item" href={child.href}>
                <span className="ch-item-text">
                  <span className="ch-item-title">{child.label}</span>
                  {child.description && <span className="ch-item-desc">{child.description}</span>}
                </span>
              </Link>
            )
          )}
        </div>
      </div>
    </li>
  );
}
