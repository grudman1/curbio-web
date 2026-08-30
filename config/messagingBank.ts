/**
 * Messaging Bank — hand-maintained copy lines for current and past campaigns.
 * Writable from the UI. Types and statuses guide what goes where.
 *
 * Added entries have `createdAt: today`. Editing in place does not change
 * the timestamp — it is the entry's record date, not its update date.
 */

export type MessageType = "hero headline" | "subhead" | "CTA" | "email subject" | "tagline" | "value prop";
export type MessageStatus = "idea" | "live" | "retired";

export type MessageLineEntry = {
  id: string;
  line: string;
  type: MessageType;
  status: MessageStatus;
  /** Page slug (e.g. "sell", "how-it-works") or campaign name. Empty for ideas. */
  usedOn?: string;
  /** When added to the bank. ISO string. */
  createdAt: string;
  /** Experiment slug if this line is being tested. Set when status is live. */
  experimentId?: string;
};

const SEED: MessageLineEntry[] = [
  {
    id: "msg:hero-1",
    line: "We do the prep. You make the sale. Seller pays at close.",
    type: "hero headline",
    status: "live",
    usedOn: "sell",
    createdAt: "2026-08-01",
  },
  {
    id: "msg:hero-subhead-1",
    line: "Move-in ready sells. Your seller pays nothing until it closes.",
    type: "subhead",
    status: "live",
    usedOn: "sell",
    createdAt: "2026-08-01",
  },
  {
    id: "msg:cta-1",
    line: "Get Started",
    type: "CTA",
    status: "live",
    usedOn: "sell",
    createdAt: "2026-08-01",
  },
];

export const MESSAGING_BANK: MessageLineEntry[] = SEED;
