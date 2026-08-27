"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import type { NoteSubject, OpsNote } from "@/lib/opsNotes";
import { OpsError, OpsSaveButton, opsField, opsLinkButton } from "../opsUi";
import { archiveNoteAction, saveNoteAction } from "./actions";

// Notes on anything: a partner, an outreach week, an event, a market, a lead.
// Author and time come from the record's write stamp, so every line says who
// claimed it and when — a note without an author is not evidence of anything.

function when(iso: string): string {
  return iso.slice(0, 10);
}

export function NotesPanel({
  subjectType,
  subjectId,
  notes,
  isOwner,
  revalidate,
  emptyHint,
}: {
  subjectType: NoteSubject;
  subjectId: string;
  notes: OpsNote[];
  isOwner: boolean;
  /** The screen this panel is on, so the save can revalidate it. */
  revalidate: string;
  emptyHint?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (saving || !text.trim()) return;
    setSaving(true);
    setError(null);
    const result = await saveNoteAction({ subjectType, subjectId, text, revalidate });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setText("");
    router.refresh();
  }

  async function remove(id: string) {
    setError(null);
    const result = await archiveNoteAction(id, true, revalidate);
    if (!result.ok) return setError(result.error);
    router.refresh();
  }

  return (
    <div>
      {notes.length === 0 && (
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: SUBTLE, margin: "0 0 10px" }}>
          {emptyHint ?? "No notes yet."}
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {notes.map((n) => (
          <li
            key={n.id}
            style={{
              borderTop: "1px solid var(--color-border)",
              padding: "8px 0",
              fontFamily: "var(--font-family-sans)",
              fontSize: "var(--text-small)",
              color: "var(--color-text)",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{n.text}</div>
            <div style={{ fontSize: "var(--text-label)", color: SUBTLE, marginTop: 3, display: "flex", gap: 8 }}>
              <span>
                {n.createdBy} · {when(n.createdAt)}
              </span>
              {isOwner && (
                <button type="button" style={{ ...opsLinkButton, fontSize: "var(--text-label)" }} onClick={() => remove(n.id)}>
                  archive
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isOwner && (
        <div style={{ marginTop: 12 }}>
          <textarea
            style={{ ...opsField, minHeight: 56, resize: "vertical" }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note…"
          />
          <OpsError>{error}</OpsError>
          <div style={{ marginTop: 8 }}>
            <OpsSaveButton saving={saving} label="Add note" onClick={add} />
          </div>
        </div>
      )}
    </div>
  );
}
