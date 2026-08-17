"use client";

import { useState } from "react";
import { FAIL, MUTED, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import type { ExecNotes } from "@/lib/marketingExecNotes";
import { saveExecNotesAction } from "./actions";

// The written agenda — three labeled areas, persisted per month so the share
// route can render them read-only. Saved explicitly, never on blur: what the
// exec team reads should be what you decided to publish, not a half-typed
// thought autosaved mid-edit.

const areaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 88,
  resize: "vertical",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "10px 12px",
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  background: "var(--color-surface-raised)",
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SUBTLE,
  display: "block",
  marginBottom: 6,
};

export function NotesEditor({ month, initial }: { month: string; initial: ExecNotes | null }) {
  const [wins, setWins] = useState(initial?.wins ?? "");
  const [concerns, setConcerns] = useState(initial?.concerns ?? "");
  const [decisions, setDecisions] = useState(initial?.decisions ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setState("saving");
    setError(null);
    const result = await saveExecNotesAction(month, wins, concerns, decisions);
    if (result.ok) setState("saved");
    else {
      setState("error");
      setError(result.error);
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <label>
        <span style={labelStyle}>Wins</span>
        <textarea value={wins} onChange={(e) => { setWins(e.target.value); setState("idle"); }} placeholder="What worked this month, and why." style={areaStyle} />
      </label>
      <label>
        <span style={labelStyle}>Concerns</span>
        <textarea value={concerns} onChange={(e) => { setConcerns(e.target.value); setState("idle"); }} placeholder="What is off track, and what it costs if it stays off track." style={areaStyle} />
      </label>
      <label>
        <span style={labelStyle}>Decisions needed</span>
        <textarea value={decisions} onChange={(e) => { setDecisions(e.target.value); setState("idle"); }} placeholder="What the exec team must decide in this meeting." style={areaStyle} />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={save}
          disabled={state === "saving"}
          style={{
            cursor: state === "saving" ? "wait" : "pointer",
            border: 0,
            borderRadius: "var(--radius-pill)",
            background: "var(--color-text)",
            color: "var(--color-surface-raised, #fff)",
            fontFamily: "var(--font-family-sans)",
            fontSize: 12.5,
            fontWeight: 700,
            padding: "8px 18px",
          }}
        >
          {state === "saving" ? "Saving…" : `Save for ${month}`}
        </button>
        {state === "saved" && (
          <span style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", fontWeight: 700, color: "var(--color-state-success)" }}>
            Saved — the share view now shows this.
          </span>
        )}
        {state === "error" && error && (
          <span style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: FAIL }}>{error}</span>
        )}
        <span style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, marginLeft: "auto" }}>
          Persists per month; the read-only share route renders it.
        </span>
      </div>
    </div>
  );
}
