// ─────────────────────────────────────────────────────────────────────────────
// THE admin IA. Five top-level sections, no group labels — Pipedrive/
// Instantly/Linear register, not a map of what we happened to build in what
// order. Sidebar is app/(site)/admin/_ui/Sidebar.tsx.
//
// Settings is a normal row here now (2026-08 sidebar redesign), not a
// hardcoded icon-only footer item — it renders exactly like Home, at the
// bottom of the list, because it's genuinely a screen like any other, not
// chrome. The sign-out control and account identity moved to the header
// instead (AppShell.tsx) — they aren't navigation.
//
// GRAIN is declared per leaf route and is not cosmetic: it decides which
// timeframe options the header offers and whether a request has to be
// coerced.
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

export type NavSubItem = { href: string; label: string; grain: Grain };

export type NavTopItem = {
  key: string;
  label: string;
  icon: string;
  /** Where the row itself links — for a row with subItems, its first child. */
  href: string;
  /** Required when there are no subItems — this row IS the leaf route. */
  grain?: Grain;
  subItems?: NavSubItem[];
};

/** The six, in the CEO's tier order — which CHANNEL_PLAN already encodes. No
 *  tier badges here (redesign point 7): tier information lives on each
 *  channel's own screen now, not the nav. */
function channelSubItems(): NavSubItem[] {
  return CHANNEL_PLAN.map((c) => ({ href: `/admin/channels/${c.slug}`, label: c.label, grain: "month" }));
}

export const ADMIN_NAV: NavTopItem[] = [
  { key: "home", href: "/admin", label: "Home", icon: "today", grain: "month" },
  {
    key: "channels",
    href: "/admin/channels/email",
    label: "Channels",
    icon: "channels",
    subItems: channelSubItems(),
  },
  {
    key: "site",
    href: "/admin/pages",
    label: "Site",
    icon: "site",
    subItems: [
      { href: "/admin/pages", label: "Pages", grain: "day" },
      { href: "/admin/experiments", label: "Experiments", grain: "day" },
      { href: "/admin/site/forms", label: "Forms", grain: "day" },
      { href: "/admin/site/links", label: "Links", grain: "day" },
      { href: "/admin/leads", label: "Leads", grain: "day" },
    ],
  },
  {
    key: "analytics",
    href: "/admin/performance",
    label: "Analytics",
    icon: "analytics",
    subItems: [
      { href: "/admin/performance", label: "Performance", grain: "month" },
      { href: "/admin/markets", label: "Markets", grain: "month" },
      { href: "/admin/attribution", label: "Attribution", grain: "month" },
      // The monthly exec review — moved in from the retired /marketing hub
      // (two-tree consolidation, 2026-08). Without this entry the screen
      // would exist only as a URL nobody can find.
      { href: "/admin/executive", label: "Executive", grain: "month" },
    ],
  },
  { key: "settings", href: "/admin/settings", label: "Settings", icon: "gear", grain: "day" },
];

// ── In-page tabs — not sidebar items ─────────────────────────────────────────
//
// The working views of a channel are not peers of it. Outreach is HOW
// Partnerships gets done and Call plan is its queue; Database is Email's
// contact pool. These are real routes with their own URLs, not client-side
// state, but they render via a channel's own layout.tsx + SubTabs — never in
// ADMIN_NAV — same as they were before the redesign.

export const PARTNERSHIP_TABS = [
  { href: "/admin/channels/partnerships", label: "Overview" },
  { href: "/admin/channels/partnerships/call-plan", label: "Call plan" },
  { href: "/admin/channels/partnerships/outreach", label: "Outreach" },
];

// Contacts moved here from Attribution (2026-08 nav redesign): it fills from
// ActiveCampaign/Instantly, so it's email database data, not an attribution
// instrument. Attribution itself dropped to Health only — no tab strip left.
export const EMAIL_TABS = [
  { href: "/admin/channels/email", label: "Overview" },
  { href: "/admin/channels/email/database", label: "Database" },
];

type FlatLeaf = { href: string; grain: Grain };

const ALL_LEAVES: FlatLeaf[] = ADMIN_NAV.flatMap((item) =>
  item.subItems && item.subItems.length > 0
    ? item.subItems.map((s) => ({ href: s.href, grain: s.grain }))
    : [{ href: item.href, grain: item.grain ?? "day" }]
);

/** Grain for a pathname — longest matching href wins, so /admin/leads beats
 *  /admin and /admin/channels/email beats /admin/channels. Defaults to `day`
 *  — the finer grain, which offers every option and coerces nothing. An
 *  unknown screen (including in-page tabs above, which aren't leaves here)
 *  must not silently inherit the more restrictive one. */
export function grainFor(pathname: string): Grain {
  let best: FlatLeaf | null = null;
  for (const leaf of ALL_LEAVES) {
    const hit = leaf.href === "/admin" ? pathname === "/admin" : pathname.startsWith(leaf.href);
    if (hit && (!best || leaf.href.length > best.href.length)) best = leaf;
  }
  return best?.grain ?? "day";
}
