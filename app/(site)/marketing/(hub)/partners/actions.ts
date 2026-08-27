"use server";

import { ownerSession } from "@/lib/adminGuards";
import { PARTNER_OBJECT, readOpsPartner, type Partner } from "@/lib/opsPartners";
import { setOpsArchived, stampRecord, writeOpsRecord } from "@/lib/opsStore";
import { parseCount, PARTNER_PATHS, revalidateAll } from "../opsActionUtils";

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

export async function savePartnerAction(input: SavePartnerInput): Promise<SavePartnerResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required — a partner nobody can recognise is a row nobody maintains." };

  const nextStepDate = input.nextStepDate.trim();
  if (nextStepDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextStepDate))
    return { ok: false, error: "Next step date must be a calendar date (YYYY-MM-DD), or empty when nothing is scheduled." };

  const agentsReached = parseCount(input.agentsReached, "Agents reached");
  if (typeof agentsReached === "object" && agentsReached !== null) return { ok: false, error: agentsReached.error };
  const meetingsBooked = parseCount(input.meetingsBooked, "Meetings booked");
  if (typeof meetingsBooked === "object" && meetingsBooked !== null) return { ok: false, error: meetingsBooked.error };

  const existing = input.id ? await readOpsPartner(input.id) : null;
  if (input.id && !existing) return { ok: false, error: "That record no longer resolves — reload the plan." };

  const now = new Date().toISOString();
  const partner = stampRecord<Partner>(
    existing,
    {
      name,
      stage: input.stage.trim(),
      owner: input.owner.trim(),
      nextStep: input.nextStep.trim(),
      nextStepDate,
      notes: input.notes.trim(),
      agentsReached,
      meetingsBooked,
    },
    session.email,
    now
  );

  try {
    await writeOpsRecord(PARTNER_OBJECT, partner, {
      at: now,
      by: session.email,
      recordId: partner.id,
      label: partner.name,
      action: existing ? "update" : "create",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }

  revalidateAll(PARTNER_PATHS);
  return { ok: true, id: partner.id };
}

export type ArchiveResult = { ok: true } | { ok: false; error: string };

export async function archivePartnerAction(id: string, archived: boolean): Promise<ArchiveResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  try {
    const next = await setOpsArchived<Partner>(PARTNER_OBJECT, id, archived, session.email, (p) => p.name);
    if (!next) return { ok: false, error: "That record no longer resolves — reload the plan." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }
  revalidateAll(PARTNER_PATHS);
  return { ok: true };
}
