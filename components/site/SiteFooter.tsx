"use client";

import Image from "next/image";
import Link from "next/link";
import { NAVIGATION } from "@/config/navigation";

/**
 * Global site footer. Like the header, it renders config and nothing else —
 * columns, legal links, and social all come from config/navigation.ts.
 */
export function SiteFooter() {
  return (
    <footer className="bg-surface-inverse">
      <div className="mx-auto max-w-container px-6 py-16">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div>
            <Image
              src="/logo/curbio-white.svg"
              alt="Curbio"
              width={500}
              height={130}
              unoptimized
              className="h-[26px] w-auto"
            />
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-16">
            {NAVIGATION.footerColumns.map((col) => (
              <div key={col.title}>
                <h2 className="text-label font-black uppercase tracking-[var(--tracking-label)] text-brand-subtle">
                  {col.title}
                </h2>
                <ul className="mt-4 flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-small text-content-inverse transition-colors duration-fast ease-out hover:text-content-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-edge-inverse pt-8 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAVIGATION.legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-micro text-brand-subtle transition-colors duration-fast ease-out hover:text-content-inverse"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <CookiePreferencesTrigger />
            </li>
          </ul>

          {NAVIGATION.social.length > 0 && (
            <ul className="flex items-center gap-4">
              {NAVIGATION.social.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="text-micro text-brand-subtle hover:text-content-inverse"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
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
 *
 * Deliberately NOT importing anything from lib/consent.ts: that module is the
 * read side of consent state. Reopening the banner is CookieYes's own UI, and
 * routing it through our consent module would imply we control a dialog we do
 * not own.
 */
function CookiePreferencesTrigger() {
  return (
    <button
      type="button"
      className="cky-banner-element text-micro text-brand-subtle transition-colors duration-fast ease-out hover:text-content-inverse"
      onClick={() => {
        (window as unknown as { revisitCkyConsent?: () => void }).revisitCkyConsent?.();
      }}
    >
      Cookie preferences
    </button>
  );
}
