import {
  readOpsRecord,
  readOpsRecords,
  type OpsReadResult,
  type OpsRecord,
} from "./opsStore";

// Notes — attachable to any ops object, plus markets and leads.
//
// THE RULE THAT MATTERS: a note on a lead attaches to the lead's ID *in the
// ops store*. It never writes to the lead record itself. Leads are measured
// and arrive over the wire; a note is claimed and typed by a person. Mixing
// them would put an editable field inside a measurement — exactly the
// distinction the two-store discipline exists to keep structural.
//
// Author and timestamp come from the write stamp every ops record carries
// (createdBy / createdAt), so a note cannot exist without an author.

export const NOTE_OBJECT = "note";

/** What a note can hang off. `lead` and `market` are not ops objects — the
 *  note points at their id/slug from over here, one-way. */
export const NOTE_SUBJECTS = ["partner", "outreach", "event", "spend", "market", "lead"] as const;
export type NoteSubject = (typeof NOTE_SUBJECTS)[number];

export type OpsNote = OpsRecord & {
  subjectType: NoteSubject;
  /** Record id, market slug, or leadId depending on subjectType. */
  subjectId: string;
  text: string;
};

export function readOpsNotes(): Promise<OpsReadResult<OpsNote>> {
  return readOpsRecords<OpsNote>(NOTE_OBJECT);
}

export function readOpsNote(id: string): Promise<OpsNote | null> {
  return readOpsRecord<OpsNote>(NOTE_OBJECT, id);
}

/** Notes for one subject, newest first. */
export async function readNotesFor(
  subjectType: NoteSubject,
  subjectId: string
): Promise<{ configured: boolean; notes: OpsNote[] }> {
  const result = await readOpsNotes();
  if (!result.configured) return { configured: false, notes: [] };
  const notes = result.records
    .filter((n) => !n.archived && n.subjectType === subjectType && n.subjectId === subjectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { configured: true, notes };
}
