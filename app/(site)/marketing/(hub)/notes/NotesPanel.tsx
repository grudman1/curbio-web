"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/(site)/admin/_ui/Button";
import { IconButton } from "@/app/(site)/admin/_ui/DataTable";
import { Textarea } from "@/app/(site)/admin/_ui/Field";
import { useToast } from "@/app/(site)/admin/_ui/Toast";
import type { NoteSubject, OpsNote } from "@/lib/opsNotes";
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
  const toast = useToast();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (saving || !text.trim()) return;
    setSaving(true);
    const result = await saveNoteAction({ subjectType, subjectId, text, revalidate });
    setSaving(false);
    if (!result.ok) return toast("error", result.error);
    setText("");
    toast("success", "Note added.");
    router.refresh();
  }

  async function remove(id: string) {
    const result = await archiveNoteAction(id, true, revalidate);
    if (!result.ok) return toast("error", result.error);
    toast("success", "Note archived.");
    router.refresh();
  }

  return (
    <div>
      {notes.length === 0 && (
        <p className="m-0 mb-2.5 font-sans text-ops-label text-content-subtle">
          {emptyHint ?? "No notes yet."}
        </p>
      )}

      <ul className="m-0 list-none p-0">
        {notes.map((n) => (
          <li key={n.id} className="group/note border-t border-app-border py-2 font-sans text-ops-body text-content">
            <div className="whitespace-pre-wrap">{n.text}</div>
            <div className="mt-0.5 flex items-center gap-2 font-sans text-ops-label text-content-subtle">
              <span>
                {n.createdBy} · {when(n.createdAt)}
              </span>
              {isOwner && (
                <span className="opacity-0 transition-opacity duration-fast ease-out focus-within:opacity-100 group-hover/note:opacity-100">
                  <IconButton icon="archive" label="Archive this note" onClick={() => remove(n.id)} />
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isOwner && (
        <div className="mt-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note…"
            className="min-h-[56px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void add();
              }
            }}
          />
          <div className="mt-2">
            <Button variant="secondary" size="sm" disabled={saving || !text.trim()} onClick={add}>
              {saving ? "Saving…" : "Add note"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
