"use client";

import { useState } from "react";
import { Button } from "@/app/(site)/admin/_ui/Button";
import { Field, Textarea } from "@/app/(site)/admin/_ui/Field";
import { useToast } from "@/app/(site)/admin/_ui/Toast";
import type { ExecNotes } from "@/lib/marketingExecNotes";
import { saveExecNotesAction } from "./actions";

// The written agenda — three labeled areas, persisted per month so the share
// route can render them read-only. Saved explicitly, never on blur: what the
// exec team reads should be what you decided to publish, not a half-typed
// thought autosaved mid-edit.

export function NotesEditor({ month, initial }: { month: string; initial: ExecNotes | null }) {
  const toast = useToast();
  const [wins, setWins] = useState(initial?.wins ?? "");
  const [concerns, setConcerns] = useState(initial?.concerns ?? "");
  const [decisions, setDecisions] = useState(initial?.decisions ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    const result = await saveExecNotesAction(month, wins, concerns, decisions);
    setSaving(false);
    if (result.ok) toast("success", `Agenda saved for ${month} — the share view now shows this.`);
    else toast("error", result.error);
  }

  return (
    <div className="grid gap-3.5">
      <Field label="Wins">
        <Textarea
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          placeholder="What worked this month, and why."
          className="min-h-[88px]"
        />
      </Field>
      <Field label="Concerns">
        <Textarea
          value={concerns}
          onChange={(e) => setConcerns(e.target.value)}
          placeholder="What is off track, and what it costs if it stays off track."
          className="min-h-[88px]"
        />
      </Field>
      <Field label="Decisions needed">
        <Textarea
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          placeholder="What the exec team must decide in this meeting."
          className="min-h-[88px]"
        />
      </Field>
      <div>
        <Button variant="primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : `Save for ${month}`}
        </Button>
      </div>
    </div>
  );
}
