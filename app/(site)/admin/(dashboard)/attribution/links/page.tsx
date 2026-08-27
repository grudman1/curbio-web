import type { Metadata } from "next";

// Attribution › Links — a TAB of Attribution, not a peer of it.
// Links is an instrument of attribution, not a separate destination.
export const metadata: Metadata = {
  title: "Links · Attribution · Ops — Curbio",
  robots: { index: false, follow: false },
};

export { default } from "@/app/(site)/marketing/(hub)/links/page";
