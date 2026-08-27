"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { LoggedValue } from "@/app/(site)/admin/_ui/Logged";
import { OUTREACH_ARMS } from "@/config/marketingHub";
import type { OutreachEntry } from "@/lib/opsOutreach";
import { DASH, OutlineBar, td, th } from "../hubUi";
import {
  ArchivedList,
  OpsError,
  OpsFormCard,
  OpsFormGrid,
  OpsSaveButton,
  opsField,
  opsFieldLabel,
  opsLinkButton,
} from "../opsUi";
import { archiveOutreachAction, saveOutreachAction, type SaveOutreachInput } from "./actions";

// The cadence table, editable in place. One row per HSM for the selected
// week; the row shows that week's entry if one exists, dashes if not.
//
// Every number is LOGGED — the A/B this feeds decides which arm books face
// time, so these must never read as measured events.

export type HsmRow = { name: string; covers: string };

type FormState = {
  id?: string;
  hsm: string;
  weekOf: string;
  arm: string;
  mailingsSent: string;
  callsMade: string;
  meetingsBooked: string;
};

function formFor(hsm: string, weekOf: string, entry: OutreachEntry | null): FormState {
  return {
    id: entry?.id,
    hsm,
    weekOf,
    arm: entry?.arm ?? OUTREACH_ARMS[0].key,
    mailingsSent: entry?.mailingsSent === null || entry === null ? "" : String(entry.mailingsSent),
    callsMade: entry?.callsMade === null || entry === null ? "" : String(entry.callsMade),
    meetingsBooked: entry?.meetingsBooked === null || entry === null ? "" : String(entry.meetingsBooked),
  };
}

function armLabel(key: string): string {
  return OUTREACH_ARMS.find((a) => a.key === key)?.label ?? key;
}

export function CadenceTable({
  hsms,
  entries,
  archived,
  weekOf,
  weeks,
  mailingsTarget,
  callsTarget,
  isOwner,
}: {
  hsms: HsmRow[];
  entries: OutreachEntry[];
  archived: OutreachEntry[];
  weekOf: string;
  weeks: string[];
  mailingsTarget: number;
  callsTarget: number;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState(weekOf);

  const byHsm = new Map(entries.filter((e) => e.weekOf === week).map((e) => [e.hsm, e]));

  async function save() {
    if (!form || saving) return;
    setSaving(true);
    setError(null);
    const result = await saveOutreachAction(form as SaveOutreachInput);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setForm(null);
    router.refresh();
  }

  async function restore(id: string) {
    setError(null);
    const result = await archiveOutreachAction(id, false);
    if (!result.ok) return setError(result.error);
    router.refresh();
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ ...opsFieldLabel, marginBottom: 0 }}>Week of</span>
        <select
          style={{ ...opsField, width: "auto" }}
          value={week}
          onChange={(e) => {
            setWeek(e.target.value);
            setForm(null);
          }}
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>HSM</th>
              <th style={th}>Mailings this week</th>
              <th style={th}>Calls this week</th>
              <th style={th}>Arm</th>
              <th style={{ ...th, textAlign: "right" }}>Meetings booked</th>
              {isOwner && <th style={th} aria-label="actions" />}
            </tr>
          </thead>
          <tbody>
            {hsms.map((h) => {
              const e = byHsm.get(h.name) ?? null;
              return (
                <tr key={h.name}>
                  <td style={{ ...td, minWidth: 180 }}>
                    <div style={{ fontWeight: 600 }}>{h.name}</div>
                    <div style={{ fontSize: "var(--text-label)", color: SUBTLE, marginTop: 1 }}>{h.covers}</div>
                  </td>
                  <td style={td}>
                    {e && e.mailingsSent !== null ? (
                      <OutlineBar label={`${e.mailingsSent} of ${mailingsTarget}`} fraction={e.mailingsSent / mailingsTarget} />
                    ) : (
                      <OutlineBar label={`${DASH} of ${mailingsTarget}`} />
                    )}
                  </td>
                  <td style={td}>
                    {e && e.callsMade !== null ? (
                      <OutlineBar label={`${e.callsMade} of ${callsTarget}`} fraction={e.callsMade / callsTarget} />
                    ) : (
                      <OutlineBar label={`${DASH} of ${callsTarget}`} />
                    )}
                  </td>
                  <td style={{ ...td, color: e ? undefined : SUBTLE }}>{e ? armLabel(e.arm) : DASH}</td>
                  <td style={{ ...td, textAlign: "right", color: e && e.meetingsBooked !== null ? undefined : SUBTLE }}>
                    {e && e.meetingsBooked !== null ? <LoggedValue value={e.meetingsBooked} /> : DASH}
                  </td>
                  {isOwner && (
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        type="button"
                        style={opsLinkButton}
                        onClick={() => {
                          setError(null);
                          setForm(formFor(h.name, week, e));
                        }}
                      >
                        {e ? "edit" : "log"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isOwner && form && (
        <OpsFormCard>
          <OpsFormGrid>
            <label>
              <span style={opsFieldLabel}>HSM</span>
              <input style={{ ...opsField, opacity: 0.7 }} value={form.hsm} readOnly />
            </label>
            <label>
              <span style={opsFieldLabel}>Week of</span>
              <input style={opsField} type="date" value={form.weekOf} onChange={set("weekOf")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Arm</span>
              <select style={opsField} value={form.arm} onChange={set("arm")}>
                {OUTREACH_ARMS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={opsFieldLabel}>Mailings sent (logged)</span>
              <input style={opsField} type="number" min={0} step={1} value={form.mailingsSent} onChange={set("mailingsSent")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Calls made (logged)</span>
              <input style={opsField} type="number" min={0} step={1} value={form.callsMade} onChange={set("callsMade")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Meetings booked (logged)</span>
              <input style={opsField} type="number" min={0} step={1} value={form.meetingsBooked} onChange={set("meetingsBooked")} />
            </label>
          </OpsFormGrid>

          <OpsError>{error}</OpsError>

          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 14 }}>
            <OpsSaveButton saving={saving} label={form.id ? "Save week" : "Log week"} onClick={save} />
            <button type="button" style={opsLinkButton} onClick={() => setForm(null)}>
              cancel
            </button>
            {form.id && (
              <button
                type="button"
                style={{ ...opsLinkButton, color: SUBTLE, marginLeft: "auto" }}
                onClick={async () => {
                  const result = await archiveOutreachAction(form.id!, true);
                  if (!result.ok) return setError(result.error);
                  setForm(null);
                  router.refresh();
                }}
              >
                archive
              </button>
            )}
          </div>
        </OpsFormCard>
      )}

      {!form && error && <OpsError>{error}</OpsError>}

      <ArchivedList
        records={archived}
        label={(e) => `${e.hsm} · week of ${e.weekOf}`}
        isOwner={isOwner}
        onRestore={restore}
      />
    </>
  );
}
