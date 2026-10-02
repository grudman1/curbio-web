import type { Metadata } from "next";
import { GiveawayRules } from "@/components/giveaway/GiveawayRules";
import { expcon } from "@/config/giveaways/expcon";
import { routeMetadata } from "@/config/routes";

// Official Rules for the eXpcon 2026 giveaway. Generated from the same
// settings file as the page and the drawing — see GiveawayRules.tsx.
export const metadata: Metadata = {
  title: "Official Rules — Curbio eXpcon 2026 Giveaway",
  description: "Official rules for Curbio's eXpcon Salt Lake City 2026 giveaway. No purchase necessary.",
  ...routeMetadata(expcon.rules.path),
};

export default function ExpconRulesPage() {
  return <GiveawayRules giveaway={expcon} />;
}
