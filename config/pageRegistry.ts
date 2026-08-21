import { ROUTES } from "./routes";
import { MARKETS, marketPath } from "./markets";
import { CAMPAIGNS } from "./campaigns";
import { NAVIGATION, isGroup } from "./navigation";

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
// The gap between "linked in the nav" and "exists in the app" IS the backlog,
// and it updates itself when either side changes.
//
// STATUS SEMANTICS — deliberately three-valued and honest:
//   live     built, rendering, content is real
//   stub     built and RENDERING PUBLICLY, but the content is scaffolding —
//            the template exists, the marketing copy does not. (Formerly
//            "draft", which wrongly implied the page wasn't reachable.)
//   planned  linked in the nav, no route behind it
//
// There is no `owner` field: one person uses this. `group` is the only
// classification.
// ─────────────────────────────────────────────────────────────────────────────

export type PageStatus = "live" | "stub" | "planned";
export type PageGroup = "campaigns" | "site" | "internal";

export type RegistryEntry = {
  path: string;
  group: PageGroup;
  title: string;
  status: PageStatus;
  /** Indexable today. Campaign tier never is; site/partner flip at cutover. */
  indexed: boolean;
  /** Which config produced this row — so a surprising entry is traceable. */
  derivedFrom: string;
  /** Free-text context worth showing on the card. */
  note?: string;
};

/**
 * Pages the nav links to that ALREADY EXIST on the WordPress site today.
 * User-supplied fact (2026-07-29) that lives in no config: these aren't
 * missing pages, just ordinary migrate-or-redirect work at cutover. The lead
 * form's TCPA consent text links to /privacy-policy, which is why it must not
 * fall through the cracks — but it is not more urgent than any other row.
 */
const EXISTS_ON_WORDPRESS = new Set(["/privacy-policy", "/terms"]);

/** Indexability for a path, from the tier map. Unlisted = not indexed. */
function indexedFor(publicPath: string): boolean {
  return ROUTES.find((r) => r.publicPath === publicPath)?.indexed ?? false;
}

/** Every route that actually EXISTS in the app right now. */
function implementedPages(): RegistryEntry[] {
  const out: RegistryEntry[] = [];

  // Campaign tier — one entry per registered campaign, plus its per-market
  // variants when it has a picker.
  // Titles here are ADMIN DISPLAY NAMES — this registry feeds only the
  // Control Room's Pages tab, so keep them as simple as possible. The pages'
  // real <title>/SEO strings live in each campaign's `meta`, untouched.
  const simpleName = (slug: string) =>
    `${slug.charAt(0).toUpperCase()}${slug.slice(1)} Campaign`;
  for (const c of CAMPAIGNS) {
    out.push({
      path: `/lp/${c.slug}`,
      group: "campaigns",
      title: simpleName(c.slug),
      status: "live",
      indexed: false, // campaign tier, permanently
      derivedFrom: "config/campaigns",
    });
    if (c.market.mode === "picker") {
      out.push({
        path: `/lp/${c.slug}/m/:market`,
        group: "campaigns",
        title: `${simpleName(c.slug)} — per-market (${MARKETS.length} variants)`,
        status: "live",
        indexed: false,
        derivedFrom: "config/campaigns × config/markets",
      });
    }
  }
  out.push({
    path: "/lp/:campaign/confirm",
    group: "campaigns",
    title: "Booking Confirmation",
    status: "live",
    indexed: false,
    derivedFrom: "config/routes.ts",
  });

  // Partner tier — same template, site group.
  out.push({
    path: "/exp",
    group: "site",
    title: "eXp Partner Page",
    status: "live",
    indexed: indexedFor("/exp"),
    derivedFrom: "config/campaigns/exp.ts",
  });
  out.push({
    path: "/exp/m/:market",
    group: "site",
    title: `eXp Partner Page — per-market (${MARKETS.length} variants)`,
    status: "live",
    indexed: indexedFor("/exp/m/:market"),
    derivedFrom: "config/campaigns/exp.ts × config/markets",
  });

  // Site tier.
  // ONE homepage entry. The real homepage is being built at /home-preview and
  // replaces the placeholder at / on sign-off — two routes, one page. The
  // Pages tab previews /home-preview because that IS the homepage; the
  // placeholder at / is an implementation detail, not a second page.
  out.push({
    path: "/",
    group: "site",
    title: "Homepage",
    status: "stub", // building at /home-preview; promoted to / on sign-off
    indexed: false,
    derivedFrom: "app/(site)/home-preview → app/(site)/(chrome)/page.tsx",
    note: "building at /home-preview — replaces the placeholder at / on sign-off",
  });
  out.push({
    path: "/markets",
    group: "site",
    title: "Markets Index",
    status: "live",
    indexed: indexedFor("/markets"),
    derivedFrom: "config/routes.ts",
  });
  for (const m of MARKETS) {
    out.push({
      path: marketPath(m.slug),
      group: "site",
      title: m.displayName,
      status: "stub", // template renders; the marketing content is not written
      indexed: indexedFor("/markets/:slug"),
      derivedFrom: "config/markets.ts",
    });
  }

  // Internal — exactly one root: /admin.
  out.push({
    path: "/admin",
    group: "internal",
    title: "Control Room",
    status: "live",
    indexed: false,
    derivedFrom: "app/(site)/admin",
  });
  out.push({
    path: "/admin/leads",
    group: "internal",
    title: "Leads",
    status: "live",
    indexed: false,
    derivedFrom: "app/(site)/admin/(dashboard)/leads",
    note: "Leads tab of the Control Room",
  });
  out.push({
    path: "/admin/waitlist",
    group: "internal",
    title: "Waitlist",
    status: "live",
    indexed: false,
    derivedFrom: "app/(site)/admin/(dashboard)/waitlist",
    note: "out-of-area signups, kept out of the CRM and leads:v1 entirely — the expansion-demand signal",
  });
  out.push({
    path: "/marketing",
    group: "internal",
    title: "Marketing Hub",
    status: "stub", // own control room; interim snapshot data, live sources still unwired (see config/marketingHub.ts registry)
    indexed: false,
    derivedFrom: "app/(site)/marketing",
    note: "the marketing control room — same admin session; /admin/marketing/* 301s here",
  });
  out.push({
    path: "/admin/design-system",
    group: "internal",
    title: "Design System",
    status: "live",
    indexed: false,
    derivedFrom: "app/(site)/admin/design-system",
    note: "moved from /design-system (301s here)",
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
      derivedFrom: "config/navigation.ts (linked, not built)",
      note: EXISTS_ON_WORDPRESS.has(t.path)
        ? "exists on WordPress today — migrate or redirect at cutover"
        : undefined,
    });
  }

  const order: Record<PageStatus, number> = { live: 0, stub: 1, planned: 2 };
  return [...implemented, ...planned].sort(
    (a, b) => order[a.status] - order[b.status] || a.path.localeCompare(b.path)
  );
}
