import type { Metadata } from "next";

// partners — served INSIDE the Ops shell.
//
// The screen still lives at app/(site)/marketing/(hub)/partners/, which remains the
// implementation. This route re-exports it so it renders inside AppShell with
// no outbound link and no iframe. When the screen is rewritten against the
// _ui primitives, the implementation moves here and this file goes away.
//
// Metadata is declared here rather than re-exported: the hub's own title says
// "Marketing", and there is no Marketing app any more.
export const metadata: Metadata = {
  title: "Partners · Ops — Curbio",
  robots: { index: false, follow: false },
};

export { default } from "@/app/(site)/marketing/(hub)/partners/page";
