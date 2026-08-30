"use server";

import { revalidatePath } from "next/cache";
import { ownerSession } from "@/lib/adminGuards";
import { NOTE_OBJECT, NOTE_SUBJECTS, readOpsNote, type NoteSubject, type OpsNote } from "@/lib/opsNotes";
import { setOpsArchived, stampRecord, writeOpsRecord } from "@/lib/opsStore";

// Notes attach to anything. The author and timestamp are the write stamp
// every ops record carries, so a note cannot exist without an author.
//
// A note on a LEAD attaches to the lead's id from over here — this action
// never touches the lead record. See lib/opsNotes.ts.

export type SaveNoteInput = {
  id?: string;
  subjectType: string;
  subjectId: string;
  text: string;
  /** Path to revalidate — the screen the note was written on. */
  revalidate?: string;
};

export type SaveNoteResult = { ok: true; id: string } | { ok: false; error: string };

const MAX_NOTE = 4000;

/** Only ever revalidate our own admin/marketing screens: the path arrives
 *  from the client, and a client-supplied value is an input, not an
 *  instruction. */
function safePath(p: string | undefined): string {
  if (!p) return "/admin";
  return /^\/admin(\/[A-Za-z0-9\-_/[\]]*)?$/.test(p) ? p : "/admin";
}

export async function saveNoteAction(input: SaveNoteInput): Promise<SaveNoteResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };

  if (!(NOTE_SUBJECTS as readonly string[]).includes(input.subjectType))
    return { ok: false, error: "Unknown note subject." };
  const subjectId = input.subjectId.trim();
  if (!subjectId) return { ok: false, error: "A note needs something to attach to." };

  const text = input.text.trim();
  if (!text) return { ok: false, error: "An empty note is not a note." };
  if (text.length > MAX_NOTE) return { ok: false, error: `Notes are capped at ${MAX_NOTE} characters.` };

  const existing = input.id ? await readOpsNote(input.id) : null;
  if (input.id && !existing) return { ok: false, error: "That note no longer resolves — reload the screen." };

  const now = new Date().toISOString();
  const note = stampRecord<OpsNote>(
    existing,
    { subjectType: input.subjectType as NoteSubject, subjectId, text },
    session.email,
    now
  );

  try {
    await writeOpsRecord(NOTE_OBJECT, note, {
      at: now,
      by: session.email,
      recordId: note.id,
      label: `${note.subjectType}:${note.subjectId}`,
      action: existing ? "update" : "create",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }

  revalidatePath(safePath(input.revalidate));
  return { ok: true, id: note.id };
}

export type ArchiveResult = { ok: true } | { ok: false; error: string };

export async function archiveNoteAction(id: string, archived: boolean, revalidate?: string): Promise<ArchiveResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  try {
    const next = await setOpsArchived<OpsNote>(
      NOTE_OBJECT,
      id,
      archived,
      session.email,
      (n) => `${n.subjectType}:${n.subjectId}`
    );
    if (!next) return { ok: false, error: "That note no longer resolves — reload the screen." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }
  revalidatePath(safePath(revalidate));
  return { ok: true };
}
