"use server";

import { ownerSession } from "@/lib/adminGuards";
import { OUTREACH_ARMS } from "@/config/marketingHub";
import { MARKETS } from "@/config/markets";
import { OUTREACH_OBJECT, readOpsOutreachEntry, type OutreachEntry } from "@/lib/opsOutreach";
import { setOpsArchived, stampRecord, writeOpsRecord } from "@/lib/opsStore";
import { OUTREACH_PATHS, parseCount, revalidateAll } from "@/app/(site)/admin/_ui/opsActionUtils";

// Mutations for the weekly cadence. Same shape as the Partner actions —
// owner-gated, stamped, archived rather than deleted.

export type SaveOutreachInput = {
  id?: string;
  hsm: string;
  weekOf: string;
  arm: string;
  mailingsSent: string;
  callsMade: string;
  meetingsBooked: string;
};

export type SaveOutreachResult = { ok: true; id: string } | { ok: false; error: string };

/** HSM names come from config/markets.ts — the same closed list the screen
 *  renders rows from. A free-typed name would produce a row that matches no
 *  HSM and silently never appears. */
function knownHsms(): Set<string> {
  return new Set(MARKETS.map((m) => m.hsm.name));
}

export async function saveOutreachAction(input: SaveOutreachInput): Promise<SaveOutreachResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };

  const hsm = input.hsm.trim();
  if (!knownHsms().has(hsm))
    return { ok: false, error: "Unknown HSM — pick one of the people on the cadence table." };

  const weekOf = input.weekOf.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf))
    return { ok: false, error: "Week is required — a cadence number with no week belongs to no week." };

  if (!OUTREACH_ARMS.some((a) => a.key === input.arm))
    return { ok: false, error: "Arm must be one of the two the A/B is testing." };

  const mailingsSent = parseCount(input.mailingsSent, "Mailings sent");
  if (typeof mailingsSent === "object" && mailingsSent !== null) return { ok: false, error: mailingsSent.error };
  const callsMade = parseCount(input.callsMade, "Calls made");
  if (typeof callsMade === "object" && callsMade !== null) return { ok: false, error: callsMade.error };
  const meetingsBooked = parseCount(input.meetingsBooked, "Meetings booked");
  if (typeof meetingsBooked === "object" && meetingsBooked !== null) return { ok: false, error: meetingsBooked.error };

  const existing = input.id ? await readOpsOutreachEntry(input.id) : null;
  if (input.id && !existing) return { ok: false, error: "That entry no longer resolves — reload the screen." };

  const now = new Date().toISOString();
  const entry = stampRecord<OutreachEntry>(
    existing,
    { hsm, weekOf, arm: input.arm, mailingsSent, callsMade, meetingsBooked },
    session.email,
    now
  );

  try {
    await writeOpsRecord(OUTREACH_OBJECT, entry, {
      at: now,
      by: session.email,
      recordId: entry.id,
      label: `${entry.hsm} · week of ${entry.weekOf}`,
      action: existing ? "update" : "create",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }

  revalidateAll(OUTREACH_PATHS);
  return { ok: true, id: entry.id };
}

export type ArchiveResult = { ok: true } | { ok: false; error: string };

export async function archiveOutreachAction(id: string, archived: boolean): Promise<ArchiveResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  try {
    const next = await setOpsArchived<OutreachEntry>(
      OUTREACH_OBJECT,
      id,
      archived,
      session.email,
      (e) => `${e.hsm} · week of ${e.weekOf}`
    );
    if (!next) return { ok: false, error: "That entry no longer resolves — reload the screen." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }
  revalidateAll(OUTREACH_PATHS);
  return { ok: true };
}
