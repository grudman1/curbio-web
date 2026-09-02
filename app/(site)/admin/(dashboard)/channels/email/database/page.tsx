import type { Metadata } from "next";
import { ContactsScreen } from "@/app/(site)/admin/(dashboard)/channels/email/database/ContactsScreen";
import { getAllContacts, getTransitions } from "@/lib/contactStore";

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

// Reads Redis per request. The store changes on every webhook delivery, so a
// cached render would show a promotion queue that is already wrong.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [contacts, transitions] = await Promise.all([getAllContacts(), getTransitions(100)]);
  return (
    <ContactsScreen
      headingOverride="Database"
      contacts={contacts}
      transitions={transitions}
      // Distinguishes "the store is connected and genuinely holds nobody" from
      // "there is no store" — the first is a real zero, the second an em-dash.
      storeReady={contacts.length > 0}
    />
  );
}
