// ─────────────────────────────────────────────────────────────────────────────
// THE admin IA. Grouped the way the business is planned, not the way the app
// was built.
//
// The previous structure — SITE / DEMAND / PRESENT — was a map of what we
// happened to build, in the order we built it. It put Pages at the top (one
// channel out of seven, Tier 2) and left Partnerships and Super Agents (two of
// the three Tier 1 channels that carry the lead number) greyed out at the
// bottom.
//
// Groups follow the Magnificent Seven (config/channelPlan.ts) because that is
// the planning taxonomy and the monthly review agenda. Every NUMBER underneath
// is computed on the nine measured channels (lib/channels.ts). The two are
// different axes — see DECISIONS.md.
//
// GRAIN is declared per screen and is not cosmetic: it decides which timeframe
// options the header offers and whether a request has to be coerced.
//   day    Redis leads:v1 + Vercel Web Analytics — real day resolution.
//   month  config/appLeadsSnapshot — a monthly export.
//
// NO NAV ITEM MAY 404. Every href either resolves to a route in this app or
// carries `externalHref` pointing at the screen's existing /marketing home
// until it is ported. A 404 reached from our own navigation is
// indistinguishable from a bug.
// ─────────────────────────────────────────────────────────────────────────────

import type { Grain } from "@/app/(site)/admin/_ui/timeframe";
import { CHANNEL_PLAN } from "./channelPlan";

/**
 * The SITE group is TEMPORARY and this flag is its expiry.
 *
 * A migration in flight needs its own surface; a steady-state channel does
 * not. When every box in the Cutover checklist at the foot of DECISIONS.md is
 * checked, flip this to `false`: Pages and Experiments move under Organic and
 * the group disappears.
 *
 * The flag exists so that is ONE EDIT rather than a judgement call nobody ever
 * makes. A temporary group with no expiry condition is a permanent group.
 */
export const SITE_GROUP_ACTIVE = true;

export type NavItem = {
  href: string;
  label: string;
  grain: Grain;
  icon: string;
  /** Slug in config/marketingHub.ts HUB_SURFACES, when this screen is one. */
  hubSlug?: string;
  /** Slug in config/channelPlan.ts, for the Magnificent Seven screens. */
  channelSlug?: string;
  /** Set while a screen still lives at its old /marketing route. The nav links
   *  HERE instead of at `href`, so nothing in the nav can 404 mid-port. */
  externalHref?: string;
  /** Tier badge, channels only. */
  tier?: 1 | 2 | 3;
};

export type NavGroup = { title: string; items: NavItem[]; muted?: boolean };

const CHANNEL_ICON: Record<string, string> = {
  email: "email",
  partnerships: "partners",
  "super-agents": "outreach",
  paid: "paid",
  organic: "organic",
  events: "events",
  content: "content",
};

/** The seven, in the CEO's tier order — which CHANNEL_PLAN already encodes. */
function channelItems(): NavItem[] {
  return CHANNEL_PLAN.map((c) => ({
    href: `/admin/channels/${c.slug}`,
    label: c.label,
    grain: "month" as Grain,
    icon: CHANNEL_ICON[c.slug] ?? "channels",
    channelSlug: c.slug,
    tier: c.tier,
  }));
}

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Today", grain: "month", icon: "today" }],
  },
  {
    // The strategy names the channel × market report the highest-leverage
    // remaining build, three separate times. It is not a footnote in PRESENT.
    title: "The number",
    items: [
      { href: "/admin/markets", label: "Markets", grain: "month", icon: "markets", hubSlug: "markets", externalHref: "/marketing/markets" },
      { href: "/admin/funnel", label: "Funnel", grain: "month", icon: "report", hubSlug: "report", externalHref: "/marketing/report" },
    ],
  },
  { title: "Channels", items: channelItems() },
  ...(SITE_GROUP_ACTIVE
    ? [
        {
          // Time-boxed — see SITE_GROUP_ACTIVE above.
          title: "Site",
          items: [
            { href: "/admin/pages", label: "Pages", grain: "day" as Grain, icon: "pages" },
            { href: "/admin/experiments", label: "Experiments", grain: "day" as Grain, icon: "experiments" },
          ],
        },
      ]
    : []),
  {
    title: "Operate",
    items: [
      { href: "/admin/leads", label: "Leads", grain: "day", icon: "leads" },
      { href: "/admin/attribution", label: "Attribution", grain: "month", icon: "attribution", hubSlug: "attribution", externalHref: "/marketing/attribution" },
      { href: "/admin/settings", label: "Settings", grain: "month", icon: "settings", hubSlug: "settings", externalHref: "/marketing/settings" },
    ],
  },
  {
    title: "Present",
    items: [
      { href: "/admin/executive", label: "Executive", grain: "month", icon: "executive", hubSlug: "executive", externalHref: "/marketing/executive" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = ADMIN_NAV.flatMap((g) => g.items);

/** Where the nav should actually send you today. */
export function navHref(item: NavItem): string {
  return item.externalHref ?? item.href;
}

/** The nav item owning a pathname — longest matching href wins, so
 *  /admin/leads beats /admin. Matches on both the eventual href and the
 *  interim external one, so a ported-or-not screen highlights correctly. */
export function navItemFor(pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of ALL_NAV_ITEMS) {
    for (const href of [item.href, item.externalHref]) {
      if (!href) continue;
      const hit = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
      if (hit && (!best || href.length > (best.externalHref ?? best.href).length)) best = item;
    }
  }
  return best;
}

/** Grain for a pathname. Defaults to `day` — the finer grain, which offers
 *  every option and coerces nothing. An unknown screen must not silently
 *  inherit the more restrictive one. */
export function grainFor(pathname: string): Grain {
  return navItemFor(pathname)?.grain ?? "day";
}
