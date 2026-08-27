"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { LoggedValue } from "@/app/(site)/admin/_ui/Logged";
import type { Partner } from "@/lib/opsPartners";
import { DASH, td, tdDash, th } from "../hubUi";
import { archivePartnerAction, savePartnerAction, type SavePartnerInput } from "./actions";

// The Call Plan, live. Stored records render their values; the seed rows
// (config PARTNER_SEED, not yet saved) render as before — name, stage, and
// dashes — until the first save turns them into records.
//
// Editing is owner-only DISPLAY here; the real gate is ownerSession() inside
// every action. Members see the same table, minus the edit affordances.

/** A seed row not yet in the store: name + stage only, everything else DASH. */
export type PlanRow =
  | { kind: "record"; partner: Partner }
  | { kind: "seed"; name: string; stage: string };

const field: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "7px 10px",
  background: "var(--color-surface-raised)",
  width: "100%",
};

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SUBTLE,
  display: "block",
  marginBottom: 5,
};

const editLink: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-label)",
  color: "var(--color-brand)",
  background: "none",
  border: 0,
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
};

type FormState = {
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

function emptyForm(): FormState {
  return { name: "", stage: "", owner: "", nextStep: "", nextStepDate: "", notes: "", agentsReached: "", meetingsBooked: "" };
}

function formFor(row: PlanRow): FormState {
  if (row.kind === "seed") return { ...emptyForm(), name: row.name, stage: row.stage };
  const p = row.partner;
  return {
    id: p.id,
    name: p.name,
    stage: p.stage,
    owner: p.owner,
    nextStep: p.nextStep,
    nextStepDate: p.nextStepDate,
    notes: p.notes,
    agentsReached: p.agentsReached === null ? "" : String(p.agentsReached),
    meetingsBooked: p.meetingsBooked === null ? "" : String(p.meetingsBooked),
  };
}

export function CallPlanTable({ rows, archived, isOwner }: { rows: PlanRow[]; archived: Partner[]; isOwner: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form || saving) return;
    setSaving(true);
    setError(null);
    const result = await savePartnerAction(form as SavePartnerInput);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(null);
    router.refresh();
  }

  async function setArchived(id: string, value: boolean) {
    setError(null);
    const result = await archivePartnerAction(id, value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(null);
    router.refresh();
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Partner</th>
              <th style={th}>Stage</th>
              <th style={th}>Next step</th>
              <th style={th}>Next step date</th>
              <th style={th}>Owner</th>
              <th style={{ ...th, textAlign: "right" }}>Agents reached</th>
              <th style={{ ...th, textAlign: "right" }}>Meetings</th>
              {isOwner && <th style={th} aria-label="actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const p = row.kind === "record" ? row.partner : null;
              const key = p ? p.id : `seed:${row.kind === "seed" ? row.name : ""}`;
              return (
                <tr key={key}>
                  <td style={{ ...td, fontWeight: 600 }}>
                    {p ? p.name : row.kind === "seed" ? row.name : ""}
                    {p?.notes ? (
                      <div
                        style={{
                          fontWeight: 400,
                          fontFamily: "var(--font-family-sans)",
                          fontSize: "var(--text-label)",
                          color: SUBTLE,
                          maxWidth: 320,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={p.notes}
                      >
                        {p.notes}
                      </div>
                    ) : null}
                  </td>
                  <td style={td}>{p ? p.stage || DASH : row.kind === "seed" ? row.stage : DASH}</td>
                  <td style={p?.nextStep ? td : tdDash}>{p?.nextStep || DASH}</td>
                  <td style={p?.nextStepDate ? td : tdDash}>{p?.nextStepDate || DASH}</td>
                  <td style={p?.owner ? td : tdDash}>{p?.owner || DASH}</td>
                  <td style={{ ...(p && p.agentsReached !== null ? td : tdDash), textAlign: "right" }}>
                    {p && p.agentsReached !== null ? <LoggedValue value={p.agentsReached} /> : DASH}
                  </td>
                  <td style={{ ...(p && p.meetingsBooked !== null ? td : tdDash), textAlign: "right" }}>
                    {p && p.meetingsBooked !== null ? <LoggedValue value={p.meetingsBooked} /> : DASH}
                  </td>
                  {isOwner && (
                    <td style={{ ...td, textAlign: "right" }}>
                      <button type="button" style={editLink} onClick={() => { setError(null); setForm(formFor(row)); }}>
                        {p ? "edit" : "add"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isOwner && !form && (
        <div style={{ marginTop: 16 }}>
          <button type="button" style={editLink} onClick={() => { setError(null); setForm(emptyForm()); }}>
            + Add partner
          </button>
        </div>
      )}

      {isOwner && form && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-surface)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label>
              <span style={fieldLabel}>Name</span>
              <input style={field} value={form.name} onChange={set("name")} />
            </label>
            <label>
              <span style={fieldLabel}>Stage</span>
              <input style={field} value={form.stage} onChange={set("stage")} placeholder="e.g. warm, transferring" />
            </label>
            <label>
              <span style={fieldLabel}>Owner</span>
              <input style={field} value={form.owner} onChange={set("owner")} />
            </label>
            <label>
              <span style={fieldLabel}>Next step</span>
              <input style={field} value={form.nextStep} onChange={set("nextStep")} />
            </label>
            <label>
              <span style={fieldLabel}>Next step date</span>
              <input style={field} type="date" value={form.nextStepDate} onChange={set("nextStepDate")} />
            </label>
            <label>
              <span style={fieldLabel}>Agents reached (logged)</span>
              <input style={field} type="number" min={0} step={1} value={form.agentsReached} onChange={set("agentsReached")} />
            </label>
            <label>
              <span style={fieldLabel}>Meetings booked (logged)</span>
              <input style={field} type="number" min={0} step={1} value={form.meetingsBooked} onChange={set("meetingsBooked")} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span style={fieldLabel}>Notes</span>
              <textarea style={{ ...field, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={set("notes")} />
            </label>
          </div>

          {error && (
            <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: "var(--color-state-error)", margin: "12px 0 0" }} role="alert">
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 14 }}>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                fontFamily: "var(--font-family-sans)",
                fontSize: "var(--text-small)",
                fontWeight: 700,
                color: "var(--color-text-on-brand, #fff)",
                background: "var(--color-brand)",
                border: 0,
                borderRadius: "var(--radius-pill, 999px)",
                padding: "7px 16px",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving…" : form.id ? "Save changes" : "Add partner"}
            </button>
            <button type="button" style={editLink} onClick={() => setForm(null)}>
              cancel
            </button>
            {form.id && (
              <button type="button" style={{ ...editLink, color: SUBTLE, marginLeft: "auto" }} onClick={() => setArchived(form.id!, true)}>
                archive
              </button>
            )}
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, cursor: "pointer" }}>
            Archived ({archived.length}) — records never delete
          </summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: SUBTLE }}>
            {archived.map((p) => (
              <li key={p.id} style={{ marginBottom: 4 }}>
                {p.name} — {p.stage || "no stage"}
                {isOwner && (
                  <>
                    {" · "}
                    <button type="button" style={editLink} onClick={() => setArchived(p.id, false)}>
                      restore
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
