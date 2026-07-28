import type { MetadataRoute } from "next";
import { MARKETS, marketPath } from "@/config/markets";
import { ROUTES, SITE_ORIGIN, routeFor } from "@/config/routes";

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap, derived. Nothing is listed by hand.
//
//   • Only INDEXED routes appear. A noindex page in a sitemap is a
//     contradiction search engines report as an error, and today every tier is
//     noindex until DNS cutover — so this is legitimately empty right now.
//     It fills itself the moment `indexed` flips in config/routes.ts.
//   • Market URLs expand from MARKETS. Adding market 8 adds its sitemap entry.
//
// Because both inputs are the same ones the router and nav use, the sitemap
// cannot describe a site that doesn't exist, or miss a page that does.
// ─────────────────────────────────────────────────────────────────────────────

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of ROUTES) {
    if (!route.indexed) continue;

    // Dynamic segments expand from their source list rather than being guessed.
    if (route.publicPath === "/markets/:slug") {
      for (const m of MARKETS) {
        entries.push({ url: new URL(marketPath(m.slug), SITE_ORIGIN).toString(), priority: 0.7 });
      }
      continue;
    }

    // Per-market rewrite targets are duplicate content that canonicalises to a
    // parent (see config/routes.ts). Including them would ask search engines to
    // index URLs we have just told them to ignore.
    if (routeFor(route.publicPath)?.canonicalPath) continue;
    if (route.publicPath.includes(":")) continue;

    entries.push({
      url: new URL(route.cutoverPath, SITE_ORIGIN).toString(),
      priority: route.cutoverPath === "/" ? 1 : 0.8,
    });
  }

  return entries;
}
