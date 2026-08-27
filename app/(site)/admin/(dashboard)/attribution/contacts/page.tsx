import type { Metadata } from "next";

// Attribution › Contacts — a TAB of Attribution, not a peer of it.
// Contacts is an instrument of attribution, not a separate destination.
export const metadata: Metadata = {
  title: "Contacts · Attribution · Ops — Curbio",
  robots: { index: false, follow: false },
};

export { default } from "@/app/(site)/marketing/(hub)/contacts/page";
