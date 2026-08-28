import type { Metadata } from "next";
import { ContactsScreen } from "@/app/(site)/marketing/(hub)/contacts/ContactsScreen";

// Email › Database — moved from Attribution › Contacts (2026-08 nav
// redesign): it fills from ActiveCampaign/Instantly, so it's email database
// data, not an attribution instrument.
//
// Same implementation, different visible name: the tab strip says "Database"
// (config/adminNav.ts EMAIL_TABS) and the page heading has to say it too —
// "Contacts" surviving as the H1 under a tab labeled "Database" is exactly
// the mixed signal the redesign moved this screen to fix.
export const metadata: Metadata = {
  title: "Database · Email · Ops — Curbio",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ContactsScreen headingOverride="Database" />;
}
