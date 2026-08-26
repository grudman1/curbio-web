// ─────────────────────────────────────────────────────────────────────────────
// THE admin IA. One sidebar for what used to be two apps.
//
// /admin had top tabs. /marketing had its own sidebar, its own header controls
// and its own timeframe. Same session, same user, same data, two mental
// models — and "Marketing" was a door that threw you into a different
// interface. This file collapses them into one shell.
//
// GRAIN is declared per screen and is not cosmetic. It decides which timeframe
// options the header offers and whether a requested timeframe has to be
// coerced. See app/(site)/admin/_ui/timeframe.ts.
//
//   day    backed by Redis leads:v1 and Vercel Web Analytics — real day
//          resolution, so 7d/30d/90d are honest.
//   month  backed by config/appLeadsSnapshot, a monthly export. Offers month
//          options only; a day request coerces and the screen says so.
//
// THE "NOT WIRED" GROUP exists on purpose. Those five screens have no data
// source yet, but each carries a documented `needs` list in
// config/marketingHub.ts, and that list is the build backlog. Burying them
// under Settings would lose it; deleting them would lose the thinking. They
// stay visible and visually muted, rendering EmptyState with their needs.
// ─────────────────────────────────────────────────────────────────────────────

import type { Grain } from "@/app/(site)/admin/_ui/timeframe";

export type NavItem = {
  href: string;
  label: string;
  grain: Grain;
  /** Icon key — geometry lives in the shell, not in config. */
  icon: string;
  /** Slug in config/marketingHub.ts HUB_SURFACES, when this screen is one. */
  hubSlug?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
  /** Rendered muted, at the bottom. The unwired backlog. */
  muted?: boolean;
};

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Today", grain: "day", icon: "today" }],
  },
  {
    title: "Site",
    items: [
      { href: "/admin/pages", label: "Pages", grain: "day", icon: "pages" },
      { href: "/admin/experiments", label: "Experiments", grain: "day", icon: "experiments" },
    ],
  },
  {
    title: "Demand",
    items: [
      { href: "/admin/leads", label: "Leads", grain: "day", icon: "leads" },
      { href: "/admin/attribution", label: "Attribution", grain: "month", icon: "attribution", hubSlug: "attribution" },
      { href: "/admin/markets", label: "Markets", grain: "month", icon: "markets", hubSlug: "markets" },
      { href: "/admin/channels", label: "Channels", grain: "month", icon: "channels", hubSlug: "channels" },
    ],
  },
  {
    title: "Present",
    items: [
      { href: "/admin/executive", label: "Executive", grain: "month", icon: "executive", hubSlug: "executive" },
      { href: "/admin/report", label: "Reports", grain: "month", icon: "report", hubSlug: "report" },
      { href: "/admin/links", label: "Links", grain: "month", icon: "links", hubSlug: "links" },
      { href: "/admin/settings", label: "Settings", grain: "month", icon: "settings", hubSlug: "settings" },
    ],
  },
  {
    title: "Not wired",
    muted: true,
    items: [
      { href: "/admin/contacts", label: "Contacts", grain: "month", icon: "contacts", hubSlug: "contacts" },
      { href: "/admin/forms", label: "Forms", grain: "month", icon: "forms", hubSlug: "forms" },
      { href: "/admin/partners", label: "Partners", grain: "month", icon: "partners", hubSlug: "partners" },
      { href: "/admin/outreach", label: "Outreach", grain: "month", icon: "outreach", hubSlug: "outreach" },
      { href: "/admin/events", label: "Events", grain: "month", icon: "events", hubSlug: "events" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = ADMIN_NAV.flatMap((g) => g.items);

/** The nav item owning a pathname — longest matching href wins, so
 *  /admin/leads beats /admin. Returns null for routes outside the shell
 *  (login, signup) rather than guessing. */
export function navItemFor(pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of ALL_NAV_ITEMS) {
    const hit = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
    if (hit && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}

/** Grain for a pathname. Defaults to `day` — the finer grain, which offers
 *  every option and coerces nothing. An unknown screen must not silently get
 *  the more restrictive one. */
export function grainFor(pathname: string): Grain {
  return navItemFor(pathname)?.grain ?? "day";
}
