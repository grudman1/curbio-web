"use server";

import { revalidatePath } from "next/cache";
import { K, getReadWriteRedis, normalizeEmail } from "@/config/contactStore";
import { ownerSession } from "@/lib/adminGuards";

/**
 * Promotion decisions — the manual gate between cold and warm.
 *
 * WHAT THIS DOES: records a human decision against a queued contact and
 * removes them from the queue.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: write to ActiveCampaign. AC has seven
 * lists (Master plus six market lists) and an Instantly lead carries no market,
 * so there is no non-guess answer to WHICH list a promoted contact joins.
 * Guessing would add a real person to a real warm list on a machine's
 * assumption — the precise failure the manual gate exists to prevent. The
 * decision is recorded and auditable; wiring the AC write is a one-call change
 * once the list rule is decided.
 *
 * There is no auto-approve path anywhere in this file, and there must not be.
 * Instantly's Interested label is AI-generated from reply content, and AI
 * misreads sarcasm and soft brush-offs.
 */

export type PromotionDecision = {
  email: string;
  decision: "approved" | "dismissed";
  at: string;
  by: string;
  note?: string;
};

export async function decidePromotion(formData: FormData): Promise<void> {
  // Owner-only, the same guard every admin mutation uses. A queue anyone
  // could POST to is a queue that can promote strangers onto the list we are
  // protecting.
  const session = await ownerSession();
  if (!session) throw new Error("Unauthorized");

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const raw = String(formData.get("decision") ?? "");
  if (!email) return;
  if (raw !== "approved" && raw !== "dismissed") return;

  const redis = getReadWriteRedis();
  if (!redis) throw new Error("Contact store unavailable");

  const decision: PromotionDecision = {
    email,
    decision: raw,
    at: new Date().toISOString(),
    by: session.email,
    note: String(formData.get("note") ?? "") || undefined,
  };

  await redis.hset(K.promotionDecisions, { [email]: JSON.stringify(decision) });
  revalidatePath("/admin/channels/email/promotion");
}
