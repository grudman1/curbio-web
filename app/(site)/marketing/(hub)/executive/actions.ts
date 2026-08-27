"use server";

import { revalidatePath } from "next/cache";
import { ownerSession } from "@/lib/adminGuards";
import { writeExecNotes } from "@/lib/marketingExecNotes";

export type SaveNotesResult = { ok: true } | { ok: false; error: string };

export async function saveExecNotesAction(
  month: string,
  wins: string,
  concerns: string,
  decisions: string
): Promise<SaveNotesResult> {
  // Same defense-in-depth as every Hub mutation: the middleware gates the
  // POST, and the shared owner guard re-checks here. (Was signed-in-only —
  // any approved member could write the exec agenda.)
  if (!(await ownerSession())) return { ok: false, error: "Owner access required." };

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, error: "Bad month." };

  try {
    await writeExecNotes(month, {
      wins: wins.trim(),
      concerns: concerns.trim(),
      decisions: decisions.trim(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }
  revalidatePath("/marketing/executive");
  return { ok: true };
}
