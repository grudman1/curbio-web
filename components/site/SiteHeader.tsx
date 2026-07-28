"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NAVIGATION,
  isCurrent,
  isGroup,
  itemIsCurrent,
  type NavItem,
} from "@/config/navigation";
import { MobileNav } from "./MobileNav";
import { MarketIndicator } from "./MarketIndicator";

/**
 * Global site header. Structure only — every label, href, and grouping comes
 * from config/navigation.ts. There is no site copy in this file by design: the
 * IA is not finalised, and a component that encodes it would have to be edited
 * every time it changes.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <header className="sticky top-0 z-header bg-surface-inverse">
      {/* Skip link — first focusable element on the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-overlay focus:rounded-md focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-content"
      >
        Skip to content
      </a>

      <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-6 py-4">
        <Link href="/" aria-label="Curbio — home" className="flex items-center">
          <Image
            src="/logo/curbio-white.svg"
            alt="Curbio"
            width={500}
            height={130}
            priority
            unoptimized
            className="h-[30px] w-auto"
          />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-6">
            {NAVIGATION.primary.map((item) => (
              <li key={item.label}>
                <DesktopItem item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {/* Market selector slot — wired, intentionally inert until Phase 3. */}
          <MarketIndicator />

          <Link
            href={NAVIGATION.cta.href}
            className="hidden min-h-[44px] items-center rounded-pill bg-accent px-5 text-small font-bold text-content-on-accent transition-colors duration-base ease-out hover:bg-accent-hover md:inline-flex"
          >
            {NAVIGATION.cta.label}
          </Link>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label="Open navigation menu"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill border border-edge-inverse text-small font-bold text-content-inverse md:hidden"
          >
            Menu
          </button>
        </div>
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
 * Desktop nav item.
 *
 * Dropdowns open on hover AND on focus, and stay open while either is true —
 * hover-only dropdowns are unreachable by keyboard, which is the single most
 * common nav accessibility failure. The parent is a real link when it has a
 * destination and a button when it only toggles, so the role always matches
 * the behaviour.
 */
function DesktopItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const current = itemIsCurrent(item, pathname);

  const linkClass =
    "inline-flex min-h-[44px] items-center text-small font-semibold text-content-inverse transition-colors duration-fast ease-out hover:text-content-accent";

  if (item.kind === "link") {
    return (
      <Link
        href={item.href}
        aria-current={current ? "page" : undefined}
        className={`${linkClass} ${current ? "text-content-accent" : ""}`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        // Only close when focus leaves the whole subtree, not when it moves
        // between the trigger and an item inside the panel.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${linkClass} gap-1 ${current ? "text-content-accent" : ""}`}
      >
        {item.label}
        <span aria-hidden>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full min-w-[240px] rounded-lg bg-surface-raised p-4 shadow-overlay">
          <ul className="flex flex-col gap-1">
            {item.children.map((child) =>
              isGroup(child) ? (
                <li key={child.label} className="pt-2 first:pt-0">
                  <p className="pb-1 text-label font-black uppercase tracking-[var(--tracking-label)] text-content-subtle">
                    {child.label}
                  </p>
                  <ul className="flex flex-col">
                    {child.items.map((link) => (
                      <li key={link.href}>
                        <DropdownLink href={link.href} label={link.label} pathname={pathname} />
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={child.href}>
                  <DropdownLink
                    href={child.href}
                    label={child.label}
                    description={child.description}
                    pathname={pathname}
                  />
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  label,
  description,
  pathname,
}: {
  href: string;
  label: string;
  description?: string;
  pathname: string;
}) {
  const current = isCurrent(href, pathname);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex min-h-[44px] flex-col justify-center rounded-md px-3 text-small text-content transition-colors duration-fast ease-out hover:bg-surface ${
        current ? "text-content-accent" : ""
      }`}
    >
      <span className="font-semibold">{label}</span>
      {description && <span className="text-micro text-content-muted">{description}</span>}
    </Link>
  );
}
