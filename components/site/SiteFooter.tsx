"use client";

import Link from "next/link";
import { NAVIGATION } from "@/config/navigation";

// Global site footer — the approved homepage design (formerly HomeFooter),
// now rendering config/navigation.ts. Columns, legal links and social all
// come from NAVIGATION; there is no site copy in this file beyond the brand
// tagline and the © line.

export function SiteFooter() {
  return (
    <footer data-dark="true" className="c-foot">
      <div className="c-container c-foot-grid">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-white.svg" alt="Curbio" style={{ height: 24, display: "block" }} />
          <p className="c-foot-tag">
            Pre-listing renovation for real estate agents. Paid at closing.
          </p>
        </div>
        {NAVIGATION.footerColumns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="c-foot-h">{col.title}</p>
            {col.links.map((link) => (
              <p key={link.href} className="c-foot-link">
                <Link href={link.href}>{link.label}</Link>
              </p>
            ))}
          </nav>
        ))}
      </div>
      <div className="c-container c-foot-bar">
        <span>© 2026 Curbio, Inc.</span>
        {NAVIGATION.legal.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <CookiePreferencesTrigger />
      </div>
    </footer>
  );
}

/**
 * Reopens the CookieYes preferences dialog.
 *
 * `cky-banner-element` is CookieYes's own documented hook — their script binds
 * the click itself. The onClick is a fallback for the case where the script
 * loaded but did not bind (and it no-ops harmlessly when CookieYes is absent,
 * which is every non-production environment, since the banner is env-gated).
 */
function CookiePreferencesTrigger() {
  return (
    <button
      type="button"
      className="cky-banner-element c-foot-cookie"
      onClick={() => {
        (window as unknown as { revisitCkyConsent?: () => void }).revisitCkyConsent?.();
      }}
    >
      Cookie preferences
    </button>
  );
}
