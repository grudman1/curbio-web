import type { Metadata } from "next";

// Partnerships › Outreach — a TAB of the channel, not a peer of it.
// This is HOW Partnerships gets done; it is not a seventh channel.
export const metadata: Metadata = {
  title: "Outreach · Partnerships · Ops — Curbio",
  robots: { index: false, follow: false },
};

export { default, dynamic } from "@/app/(site)/marketing/(hub)/outreach/page";
