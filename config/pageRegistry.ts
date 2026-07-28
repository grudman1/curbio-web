import { ROUTES } from "./routes";
import { MARKETS, marketPath } from "./markets";
import { CAMPAIGNS } from "./campaigns";
import { NAVIGATION, isGroup } from "./navigation";
import { exp } from "./campaigns/exp";

// ─────────────────────────────────────────────────────────────────────────────
// PAGE REGISTRY — the Phase 3 build tracker.
//
// DERIVED, not hand-maintained. Every entry comes from a config that already
// exists and is already the source of truth for something else:
//
//   config/routes.ts      the tier map → path, group, indexability
//   config/campaigns/     every /lp/<slug> that exists
//   config/markets.ts     every /markets/<slug> that exists
//   config/navigation.ts  every page the SITE NAV LINKS TO — which is the
//                         planned-page list, whether or not anyone meant it
//                         to be. A nav entry pointing at a route that doesn't
//                         exist is a page someone intends to build.
//
// That last one is what makes this a tracker rather than a list: the gap
// between "linked in the nav" and "exists in the app" IS the backlog, and it
// updates itself when either side changes.
//
// A hand-maintained manifest would drift from the app within a week — the
// same failure the six market lists just demonstrated at a larger scale.
// ─────────────────────────────────────────────────────────────────────────────

export type PageStatus = "live" | "draft" | "planned";
export type PageGroup = "campaigns" | "site" | "internal";

export type RegistryEntry = {
  path: string;
  group: PageGroup;
  title: string;
  status: PageStatus;
  /** Indexable today. Campaign tier never is; site/partner flip at cutover. */
  indexed: boolean;
  owner: string;
  /** Which config produced this row — so a surprising entry is traceable. */
  derivedFrom: string;
};

/**
 * Ownership. Hand-annotated because it is the one thing no config knows.
 * Keyed by path prefix, longest match wins. Unlisted paths are "unassigned",
 * which is honest — it is a real state and shows up as work to allocate.
 */
const OWNERS: { prefix: string; owner: string }[] = [
  { prefix: "/lp", owner: "marketing" },
  { prefix: "/exp", owner: "partnerships" },
  { prefix: "/markets", owner: "marketing" },
  { prefix: "/admin", owner: "engineering" },
  { prefix: "/design-system", owner: "engineering" },
];

function ownerFor(path: string): string {
  const match = OWNERS.filter((o) => path === o.prefix || path.startsWith(`${o.prefix}/`)).sort(
    (a, b) => b.prefix.length - a.prefix.length
  )[0];
  return match?.owner ?? "unassigned";
}

/** Indexability for a path, from the tier map. Unlisted = not indexed. */
function indexedFor(publicPath: string): boolean {
  return ROUTES.find((r) => r.publicPath === publicPath)?.indexed ?? false;
}

/** Every route that actually EXISTS in the app right now. */
function implementedPages(): RegistryEntry[] {
  const out: RegistryEntry[] = [];

  // Campaign tier — one entry per registered campaign, plus its per-market
  // variants when it has a picker.
  for (const c of CAMPAIGNS) {
    out.push({
      path: `/lp/${c.slug}`,
      group: "campaigns",
      title: c.meta?.title ?? `Campaign: ${c.slug}`,
      status: "live",
      indexed: false, // campaign tier, permanently
      owner: ownerFor(`/lp/${c.slug}`),
      derivedFrom: "config/campaigns",
    });
    if (c.market.mode === "picker") {
      out.push({
        path: `/lp/${c.slug}/m/:market`,
        group: "campaigns",
        title: `${c.slug} — per-market (${MARKETS.length} variants)`,
        status: "live",
        indexed: false,
        owner: ownerFor(`/lp/${c.slug}`),
        derivedFrom: "config/campaigns × config/markets",
      });
    }
  }
  out.push({
    path: "/lp/:campaign/confirm",
    group: "campaigns",
    title: "Booking confirmation",
    status: "live",
    indexed: false,
    owner: ownerFor("/lp"),
    derivedFrom: "config/routes.ts",
  });

  // Partner tier — same template, site group.
  out.push({
    path: "/exp",
    group: "site",
    title: exp.meta?.title ?? "eXp partner page",
    status: "live",
    indexed: indexedFor("/exp"),
    owner: ownerFor("/exp"),
    derivedFrom: "config/campaigns/exp.ts",
  });
  out.push({
    path: "/exp/m/:market",
    group: "site",
    title: `eXp — per-market (${MARKETS.length} variants)`,
    status: "live",
    indexed: indexedFor("/exp/m/:market"),
    owner: ownerFor("/exp"),
    derivedFrom: "config/campaigns/exp.ts × config/markets",
  });

  // Site tier.
  out.push({
    path: "/",
    group: "site",
    title: "Homepage (placeholder)",
    status: "draft",
    indexed: false,
    owner: ownerFor("/"),
    derivedFrom: "app/(site)/(chrome)/page.tsx",
  });
  out.push({
    path: "/markets",
    group: "site",
    title: "Markets index",
    status: "live",
    indexed: indexedFor("/markets"),
    owner: ownerFor("/markets"),
    derivedFrom: "config/routes.ts",
  });
  for (const m of MARKETS) {
    out.push({
      path: marketPath(m.slug),
      group: "site",
      title: `Market: ${m.displayName}`,
      status: "draft", // template is live; the marketing content is not written
      indexed: indexedFor("/markets/:slug"),
      owner: ownerFor("/markets"),
      derivedFrom: "config/markets.ts",
    });
  }

  // Internal.
  out.push({
    path: "/design-system",
    group: "internal",
    title: "Design system reference",
    status: "live",
    indexed: false,
    owner: ownerFor("/design-system"),
    derivedFrom: "app/(site)/design-system",
  });
  out.push({
    path: "/admin",
    group: "internal",
    title: "Admin — registry + lead viewer",
    status: "live",
    indexed: false,
    owner: ownerFor("/admin"),
    derivedFrom: "app/(site)/admin",
  });

  return out;
}

/** Every href the site navigation points at. */
function navigationTargets(): { path: string; title: string }[] {
  const out: { path: string; title: string }[] = [];
  for (const item of NAVIGATION.primary) {
    if (item.kind === "link") out.push({ path: item.href, title: item.label });
    else
      for (const child of item.children) {
        if (isGroup(child)) child.items.forEach((l) => out.push({ path: l.href, title: l.label }));
        else out.push({ path: child.href, title: child.label });
      }
  }
  for (const col of NAVIGATION.footerColumns) {
    col.links.forEach((l) => out.push({ path: l.href, title: l.label }));
  }
  NAVIGATION.legal.forEach((l) => out.push({ path: l.href, title: l.label }));
  out.push({ path: NAVIGATION.cta.href, title: NAVIGATION.cta.label });
  return out;
}

/**
 * The registry: what exists, plus what the nav promises and the app does not
 * yet deliver. The second half is the backlog and it maintains itself.
 */
export function buildPageRegistry(): RegistryEntry[] {
  const implemented = implementedPages();
  const known = new Set(implemented.map((e) => e.path));

  const planned: RegistryEntry[] = [];
  const seen = new Set<string>();
  for (const t of navigationTargets()) {
    if (known.has(t.path) || seen.has(t.path)) continue;
    seen.add(t.path);
    planned.push({
      path: t.path,
      group: "site",
      title: t.title,
      status: "planned",
      indexed: false,
      owner: ownerFor(t.path),
      // Naming the source matters: this row exists because something links to
      // it, which is also where to go to remove it if it shouldn't.
      derivedFrom: "config/navigation.ts (linked, not built)",
    });
  }

  const order: Record<PageStatus, number> = { live: 0, draft: 1, planned: 2 };
  return [...implemented, ...planned].sort(
    (a, b) => order[a.status] - order[b.status] || a.path.localeCompare(b.path)
  );
}

export function registrySummary(entries: RegistryEntry[]) {
  return {
    total: entries.length,
    live: entries.filter((e) => e.status === "live").length,
    draft: entries.filter((e) => e.status === "draft").length,
    planned: entries.filter((e) => e.status === "planned").length,
    indexed: entries.filter((e) => e.indexed).length,
    unassigned: entries.filter((e) => e.owner === "unassigned").length,
  };
}
