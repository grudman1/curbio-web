"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE, openSession } from "@/lib/adminSession";
import { getSessionUser, sessionSecret } from "@/lib/adminAuth";
import { writeExecNotes } from "@/lib/marketingExecNotes";

export type SaveNotesResult = { ok: true } | { ok: false; error: string };

export async function saveExecNotesAction(
  month: string,
  wins: string,
  concerns: string,
  decisions: string
): Promise<SaveNotesResult> {
  // Same defense-in-depth as every Hub mutation: the middleware gates the
  // POST, and the session is re-checked here.
  const jar = await cookies();
  const opened = await openSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  const user = opened ? await getSessionUser(opened.sid) : null;
  if (!user) return { ok: false, error: "Not signed in." };

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
