import type { Metadata } from "next";

// performance — served INSIDE the Ops shell.
//
// Renamed from Funnel (2026-08 nav redesign), same screen: the implementation
// still lives at app/(site)/marketing/(hub)/report/, which this route
// re-exports so it renders inside AppShell with no outbound link and no
// iframe. When the screen is rewritten against the _ui primitives, the
// implementation moves here and this file goes away.
//
// Metadata is declared here rather than re-exported: the hub's own title says
// "Report", and the nav now calls this Performance.
export const metadata: Metadata = {
  title: "Performance · Ops — Curbio",
  robots: { index: false, follow: false },
};

export { default } from "@/app/(site)/marketing/(hub)/report/page";
