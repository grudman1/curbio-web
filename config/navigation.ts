// ─────────────────────────────────────────────────────────────────────────────
// SITE INFORMATION ARCHITECTURE
//
// Changing the site's IA means editing THIS FILE. Never a component.
//
// SiteHeader / SiteFooter / MobileNav render whatever shape they are given —
// they contain no hardcoded labels, hrefs, or structure (with ONE sanctioned
// exception: the inert "Our Work" span in SiteHeader, documented there).
//
// This is the REAL IA (Aug 2026), replacing the placeholder structure that
// deliberately exercised dropdowns and nested groups. Everything is a flat
// top-level link; the dropdown/group types remain because the components
// still know how to render them if the IA ever grows one.
//
// "Our Work" is deliberately ABSENT here: it is visible-but-inert in the
// header (no route exists, none is planned yet), and an entry here would make
// config/pageRegistry.ts list it as planned work. It lives as a hardcoded
// span in SiteHeader until a page exists.
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
    { kind: "link", label: "How It Works", href: "/how-it-works" },
    { kind: "link", label: "Services", href: "/services" },
    // "Our Work" renders between Services and For Brokerages — see SiteHeader.
    // The nav LABEL is "For Brokerages"; the PATH is /brokers (migration plan).
    // Label and path differing is fine and intentional.
    { kind: "link", label: "For Brokerages", href: "/brokers" },
    // No Contact item: the persistent gold CTA already points at /contact, and
    // a nav link beside it would be the same destination twice. Contact stays
    // in the footer.
  ],

  cta: { label: "Free Estimate", href: "/contact" },

  footerColumns: [
    {
      title: "Company",
      links: [
        { label: "How it works", href: "/how-it-works" },
        { label: "Services", href: "/services" },
        { label: "For brokerages", href: "/brokers" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Where we work",
      links: [
        { label: "Markets", href: "/markets" },
        ...MARKETS.map((m) => ({ label: m.displayName, href: marketPath(m.slug) })),
      ],
    },
    {
      title: "Partners & legal",
      links: [
        { label: "eXp Realty partnership", href: "/exp" },
        { label: "Privacy policy", href: "/privacy-policy" },
        { label: "Terms of service", href: "/terms" },
      ],
    },
  ],

  legal: [
    // NOTE: /privacy-policy is LEGAL-BLOCKING at cutover — the lead forms'
    // TCPA consent text links to it. See the cutover checklist in DECISIONS.md.
    { label: "Privacy policy", href: "/privacy-policy" },
    { label: "Terms of service", href: "/terms" },
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
