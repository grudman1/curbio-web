import type { Metadata } from "next";
import Link from "next/link";
import { CAMPAIGN_PREFIX, ROUTES } from "@/config/routes";

// curbio.com homepage — PLACEHOLDER.
//
// Phase 2 builds foundation only; no marketing pages. This exists because the
// site group must own "/" (route groups don't add URL segments, so only one
// group can have the root — see config/routes.ts) and because preview deploys
// default to the site, making this the first thing QA lands on.
//
// It doubles as the preview entry point: the links below are how you reach the
// campaign tier at its physical path, since preview has no sell.curbio.com
// hostname to trigger the middleware rewrite.
//
// Noindex — this is scaffolding, and curbio.com is still served by WordPress.
export const metadata: Metadata = {
  title: "Curbio",
  robots: { index: false, follow: false },
};

export default function SiteHome() {
  return (
    <div className="mx-auto max-w-container px-6 py-16">
      <h1>Curbio — site group</h1>
      <p style={{ color: "var(--fg-muted)", marginTop: 12 }}>
        Phase 2 foundation. Marketing pages are not built yet. This placeholder
        exists so the site group owns <code>/</code> and so preview deploys have
        an entry point.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 40 }}>QA links</h2>
      <ul style={{ marginTop: 12, lineHeight: 2 }}>
        {ROUTES.filter((r) => !r.publicPath.includes(":market") && !r.unlisted).map((r) => (
          <li key={r.internalPath}>
            <Link href={r.internalPath}>{r.internalPath}</Link>{" "}
            <span style={{ color: "var(--fg-subtle)", fontSize: 13 }}>
              — {r.tier} tier · serves <code>sell.curbio.com{r.publicPath}</code>
            </span>
          </li>
        ))}
        <li>
          <Link href={`${CAMPAIGN_PREFIX}/m/atlanta`}>{CAMPAIGN_PREFIX}/m/atlanta</Link>{" "}
          <span style={{ color: "var(--fg-subtle)", fontSize: 13 }}>
            — per-market campaign page
          </span>
        </li>
        <li>
          <Link href="/exp/m/atlanta">/exp/m/atlanta</Link>{" "}
          <span style={{ color: "var(--fg-subtle)", fontSize: 13 }}>
            — per-market partner page
          </span>
        </li>
      </ul>
    </div>
  );
}
