import type { Metadata } from "next";
import { PromotionScreen } from "./PromotionScreen";
import { getPromotionQueue, getUnknownEvents, getSeenEventTypes } from "@/lib/contactStore";

// Email › Promotion — the cold-to-warm gate.
//
// Its own tab rather than a card on Database: this is a work queue with an
// irreversible action attached, and burying an approve button inside a
// read-only mirror invites clicking it while scanning something else.
export const metadata: Metadata = {
  title: "Promotion · Email · Ops — Curbio",
  robots: { index: false, follow: false },
};

// The queue changes on every webhook delivery; a cached render would show
// people who have already been decided on.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [queue, unknownEvents, seenEventTypes] = await Promise.all([
    getPromotionQueue(),
    getUnknownEvents(50),
    getSeenEventTypes(),
  ]);
  return (
    <PromotionScreen queue={queue} unknownEvents={unknownEvents} seenEventTypes={seenEventTypes} />
  );
}
