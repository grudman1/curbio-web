import type { Metadata } from "next";

// Site › Links — moved from Attribution (2026-08 nav redesign): link
// management is a Site instrument, not an attribution one. The undocumented-
// campaign-tags banner it carries is attribution hygiene and also renders on
// Attribution → Health and Home (lib/campaignOrphans.ts).
export const metadata: Metadata = {
  title: "Links · Site · Ops — Curbio",
  robots: { index: false, follow: false },
};

export { default } from "@/app/(site)/marketing/(hub)/links/page";
