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
// NOTHING LINKS OUT. Ops and Marketing are ONE app now. Every screen the
// Marketing Hub used to own is served at an /admin route (a thin re-export of
// the hub implementation, see app/(site)/admin/(dashboard)/*/page.tsx), so
// every nav item renders inside this shell. There are no external hrefs, no
// new tabs, and no ↗ affordances — the browser stays on one domain and inside
// one layout for the whole session.
//
// The old /marketing/* routes still resolve for anyone with a bookmark; the
// navigation simply never points at them.
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
    // remaining build. "Report" and "Funnel" were the same screen under two
    // names — one item, kept as Funnel.
    title: "Analyze",
    items: [
      { href: "/admin/funnel", label: "Funnel", grain: "month", icon: "report", hubSlug: "report" },
      { href: "/admin/channels", label: "Channels", grain: "month", icon: "channels", hubSlug: "channels" },
      { href: "/admin/markets", label: "Markets", grain: "month", icon: "markets", hubSlug: "markets" },
      { href: "/admin/attribution", label: "Attribution", grain: "month", icon: "attribution", hubSlug: "attribution" },
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
            { href: "/admin/forms", label: "Forms", grain: "month" as Grain, icon: "forms", hubSlug: "forms" },
            { href: "/admin/links", label: "Links", grain: "month" as Grain, icon: "links", hubSlug: "links" },
          ],
        },
      ]
    : []),
  {
    title: "Operate",
    items: [
      { href: "/admin/leads", label: "Leads", grain: "day", icon: "leads" },
      { href: "/admin/contacts", label: "Contacts", grain: "month", icon: "contacts", hubSlug: "contacts" },
      { href: "/admin/partners", label: "Partners", grain: "month", icon: "partners", hubSlug: "partners" },
      { href: "/admin/outreach", label: "Outreach", grain: "month", icon: "outreach", hubSlug: "outreach" },
    ],
  },
  {
    title: "Present",
    items: [
      { href: "/admin/executive", label: "Executive", grain: "month", icon: "executive", hubSlug: "executive" },
    ],
  },
];

/** Pinned to the foot of the sidebar, below everything and after a spacer.
 *  Settings is a destination you reach deliberately, not one you scan past. */
export const ADMIN_NAV_PINNED: NavGroup = {
  title: "Settings",
  items: [
    { href: "/admin/settings", label: "Settings", grain: "month", icon: "settings", hubSlug: "settings" },
  ],
};

export const ALL_NAV_ITEMS: NavItem[] = [...ADMIN_NAV, ADMIN_NAV_PINNED].flatMap((g) => g.items);

/** The nav item owning a pathname — longest matching href wins, so
 *  /admin/leads beats /admin and /admin/channels/email beats /admin/channels. */
export function navItemFor(pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of ALL_NAV_ITEMS) {
    const hit = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
    if (hit && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}

/** Grain for a pathname. Defaults to `day` — the finer grain, which offers
 *  every option and coerces nothing. An unknown screen must not silently
 *  inherit the more restrictive one. */
export function grainFor(pathname: string): Grain {
  return navItemFor(pathname)?.grain ?? "day";
}
