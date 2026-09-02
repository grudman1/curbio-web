import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";

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
  title: "Curbio — Pre-listing home improvement, fully managed",
  description:
    "Curbio is the pre-listing home improvement partner real estate agents trust. Repairs, updates, and staging, fully managed with pay-at-closing for qualified sellers.",
  robots: { index: false, follow: false },
};

export default function SiteHome() {
  return <HomePage />;
}
