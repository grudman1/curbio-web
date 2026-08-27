import type { Metadata } from "next";

// Attribution › Forms — a TAB of Attribution, not a peer of it.
// Forms is an instrument of attribution, not a separate destination.
export const metadata: Metadata = {
  title: "Forms · Attribution · Ops — Curbio",
  robots: { index: false, follow: false },
};

export { default } from "@/app/(site)/marketing/(hub)/forms/page";
