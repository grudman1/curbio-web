"use server";

import { revalidatePath } from "next/cache";
import { ownerSession } from "@/lib/adminGuards";
import {
  readOpsPartner,
  writeOpsPartner,
  type Partner,
} from "@/lib/opsPartners";

// Mutations for the Call Plan. Owner-gated via the shared re-check
// (lib/adminGuards.ts) — display gating is never the security boundary.
// No delete action exists on purpose: records archive, nothing vanishes.

export type SavePartnerInput = {
  /** Present when editing an existing record. */
  id?: string;
  name: string;
  stage: string;
  owner: string;
  nextStep: string;
  nextStepDate: string;
  notes: string;
  agentsReached: string;
  meetingsBooked: string;
};

export type SavePartnerResult = { ok: true; id: string } | { ok: false; error: string };

/** "" → null (never entered ≠ zero); otherwise a non-negative integer. */
function parseCount(raw: string, label: string): number | null | { error: string } {
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) return { error: `${label} must be a whole number — it counts things that happened.` };
  return n;
}

export async function savePartnerAction(input: SavePartnerInput): Promise<SavePartnerResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required — a partner nobody can recognise is a row nobody maintains." };

  const nextStepDate = input.nextStepDate.trim();
  if (nextStepDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextStepDate))
    return { ok: false, error: "Next step date must be a calendar date (YYYY-MM-DD), or empty when nothing is scheduled." };

  const agentsReached = parseCount(input.agentsReached, "Agents reached");
  if (agentsReached !== null && typeof agentsReached === "object") return { ok: false, error: agentsReached.error };
  const meetingsBooked = parseCount(input.meetingsBooked, "Meetings booked");
  if (meetingsBooked !== null && typeof meetingsBooked === "object") return { ok: false, error: meetingsBooked.error };

  const now = new Date().toISOString();
  // Update starts from the CURRENT stored record — id must resolve, and
  // created* survives every edit.
  const existing = input.id ? await readOpsPartner(input.id) : null;
  if (input.id && !existing) return { ok: false, error: "That record no longer resolves — reload the plan." };

  const partner: Partner = {
    id: existing?.id ?? crypto.randomUUID(),
    name,
    stage: input.stage.trim(),
    owner: input.owner.trim(),
    nextStep: input.nextStep.trim(),
    nextStepDate,
    notes: input.notes.trim(),
    agentsReached,
    meetingsBooked,
    archived: existing?.archived ?? false,
    createdAt: existing?.createdAt ?? now,
    createdBy: existing?.createdBy ?? session.email,
    updatedAt: now,
    updatedBy: session.email,
  };

  try {
    await writeOpsPartner(partner, {
      at: now,
      by: session.email,
      partnerId: partner.id,
      partnerName: partner.name,
      action: existing ? "update" : "create",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }

  revalidatePath("/marketing/partners");
  revalidatePath("/admin/channels/partnerships/call-plan");
  return { ok: true, id: partner.id };
}

export type ArchivePartnerResult = { ok: true } | { ok: false; error: string };

export async function archivePartnerAction(id: string, archived: boolean): Promise<ArchivePartnerResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };

  const existing = await readOpsPartner(id);
  if (!existing) return { ok: false, error: "That record no longer resolves — reload the plan." };

  const now = new Date().toISOString();
  try {
    await writeOpsPartner(
      { ...existing, archived, updatedAt: now, updatedBy: session.email },
      { at: now, by: session.email, partnerId: id, partnerName: existing.name, action: archived ? "archive" : "unarchive" }
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }

  revalidatePath("/marketing/partners");
  revalidatePath("/admin/channels/partnerships/call-plan");
  return { ok: true };
}
