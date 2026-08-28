import type { Metadata } from "next";
import { ContactsScreen } from "./ContactsScreen";

export const metadata: Metadata = {
  title: "Contacts · Marketing — Curbio",
  robots: { index: false, follow: false },
};

export default function ContactsPage() {
  return <ContactsScreen />;
}
