// ─────────────────────────────────────────────────────────────────────────────
// SITE INFORMATION ARCHITECTURE
//
// Changing the site's IA means editing THIS FILE. Never a component.
//
// SiteHeader / SiteFooter / MobileNav render whatever shape they are given —
// they contain no hardcoded labels, hrefs, or structure. That is the whole
// point: the IA is not finalised, so the components must not encode it.
//
// The structure below is PLACEHOLDER and deliberately exercises every case the
// components must handle:
//   • a plain top-level link                     → "Pricing"
//   • a top-level link with a flat dropdown      → "How it works"
//   • a dropdown containing NESTED GROUPS        → "Services"
//   • a dropdown generated from data, not typed  → "Markets" (from MARKETS)
//   • an active/current state                    → matched on pathname
//
// Market entries are DERIVED from config/markets.ts. Adding market 8 there
// puts it in the nav automatically — no edit here.
// ─────────────────────────────────────────────────────────────────────────────

import { MARKETS, marketPath } from "./markets";

export type NavLink = {
  label: string;
  href: string;
  /** Optional supporting line, shown in wide dropdowns. */
  description?: string;
};

/** A titled cluster of links INSIDE a dropdown. */
export type NavGroup = {
  label: string;
  items: NavLink[];
};

export type NavItem =
  | { kind: "link"; label: string; href: string }
  | { kind: "dropdown"; label: string; children: (NavLink | NavGroup)[] };

export function isGroup(child: NavLink | NavGroup): child is NavGroup {
  return "items" in child;
}

export type FooterColumn = { title: string; links: NavLink[] };
export type SocialLink = { label: string; href: string };

export type SiteNavigation = {
  primary: NavItem[];
  cta: { label: string; href: string };
  footerColumns: FooterColumn[];
  legal: NavLink[];
  social: SocialLink[];
};

export const NAVIGATION: SiteNavigation = {
  primary: [
    {
      kind: "dropdown",
      label: "How it works",
      children: [
        { label: "For agents", href: "/how-it-works/agents", description: "Win the listing, then win the sale." },
        { label: "For sellers", href: "/how-it-works/sellers", description: "Pay at closing, nothing up front." },
        { label: "Pay at closing", href: "/pay-at-closing" },
      ],
    },
    {
      kind: "dropdown",
      label: "Services",
      // Nested groups — the widest case the dropdown must render.
      children: [
        {
          label: "Interior",
          items: [
            { label: "Kitchens", href: "/services/kitchens" },
            { label: "Bathrooms", href: "/services/bathrooms" },
            { label: "Flooring & paint", href: "/services/flooring-paint" },
          ],
        },
        {
          label: "Exterior",
          items: [
            { label: "Curb appeal", href: "/services/curb-appeal" },
            { label: "Roofing", href: "/services/roofing" },
          ],
        },
        { label: "All services", href: "/services" },
      ],
    },
    {
      kind: "dropdown",
      label: "Markets",
      // Generated from the market list. Never hand-maintained.
      children: MARKETS.map((m) => ({ label: m.displayName, href: marketPath(m.slug) })),
    },
    { kind: "link", label: "Pricing", href: "/pricing" },
    { kind: "link", label: "About", href: "/about" },
  ],

  cta: { label: "Get a free estimate", href: "/get-started" },

  footerColumns: [
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Services",
      links: [
        { label: "All services", href: "/services" },
        { label: "Pay at closing", href: "/pay-at-closing" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Markets",
      links: MARKETS.map((m) => ({ label: m.displayName, href: marketPath(m.slug) })),
    },
  ],

  legal: [
    // NOTE: /privacy-policy is LEGAL-BLOCKING at cutover — FormCard's TCPA
    // consent text links to it. See the cutover checklist in DECISIONS.md.
    { label: "Privacy policy", href: "/privacy-policy" },
    { label: "Terms of service", href: "/terms" },
    { label: "Accessibility", href: "/accessibility" },
  ],

  social: [],
};

/**
 * Is `href` the current page, or an ancestor of it?
 *
 * Ancestor matching is what makes a dropdown parent highlight while you are on
 * one of its children. "/" is exact-only — otherwise it would match every page.
 */
export function isCurrent(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Does this nav item, or any descendant, match the current path? */
export function itemIsCurrent(item: NavItem, pathname: string): boolean {
  if (item.kind === "link") return isCurrent(item.href, pathname);
  return item.children.some((c) =>
    isGroup(c) ? c.items.some((i) => isCurrent(i.href, pathname)) : isCurrent(c.href, pathname)
  );
}
