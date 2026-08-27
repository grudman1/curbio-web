"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { LoggedTag } from "@/app/(site)/admin/_ui/Logged";
import { EVENT_FORMATS } from "@/config/marketingHub";
import { MARKETS } from "@/config/markets";
import { costPerAttendee, type OpsEvent } from "@/lib/opsEvents";
import { DASH, td, tdDash, th } from "../hubUi";
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
import { archiveEventAction, saveEventAction, type SaveEventInput } from "./actions";

// The event log, editable. invited → registered → attended → leads is the
// screen's own funnel; cost per attendee is DERIVED and never stored, so it
// can never drift from its inputs.

type FormState = {
  id?: string;
  name: string;
  format: string;
  market: string;
  date: string;
  campaignCode: string;
  invited: string;
  registered: string;
  attended: string;
  leads: string;
  costUsd: string;
};

const num = (v: number | null) => (v === null ? "" : String(v));

function emptyForm(): FormState {
  return {
    name: "",
    format: EVENT_FORMATS[0],
    market: "",
    date: "",
    campaignCode: "",
    invited: "",
    registered: "",
    attended: "",
    leads: "",
    costUsd: "",
  };
}

function formFor(e: OpsEvent): FormState {
  return {
    id: e.id,
    name: e.name,
    format: e.format,
    market: e.market,
    date: e.date,
    campaignCode: e.campaignCode,
    invited: num(e.invited),
    registered: num(e.registered),
    attended: num(e.attended),
    leads: num(e.leads),
    costUsd: e.costUsd === null ? "" : String(e.costUsd),
  };
}

const usd = (n: number) => `$${n.toFixed(2)}`;

export function EventLog({
  events,
  archived,
  isOwner,
}: {
  events: OpsEvent[];
  archived: OpsEvent[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form || saving) return;
    setSaving(true);
    setError(null);
    const result = await saveEventAction(form as SaveEventInput);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setForm(null);
    router.refresh();
  }

  async function setArchived(id: string, value: boolean) {
    setError(null);
    const result = await archiveEventAction(id, value);
    if (!result.ok) return setError(result.error);
    setForm(null);
    router.refresh();
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Event</th>
              <th style={th}>Format</th>
              <th style={th}>Market</th>
              <th style={th}>Date</th>
              <th style={th}>Campaign code</th>
              {/* Every count in these four columns is typed in, so the marker
                  belongs on the column, not repeated in all four cells of
                  every row — same rule, a quarter of the noise. */}
              {["Invited", "Registered", "Attended", "Leads"].map((label) => (
                <th key={label} style={{ ...th, textAlign: "right" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {label} <LoggedTag />
                  </span>
                </th>
              ))}
              <th style={{ ...th, textAlign: "right" }}>Cost per attendee</th>
              {isOwner && <th style={th} aria-label="actions" />}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td style={{ ...tdDash }} colSpan={isOwner ? 11 : 10}>
                  No events logged yet.{isOwner ? " Add the next one — the campaign code is what stops its leads landing as direct." : ""}
                </td>
              </tr>
            )}
            {events.map((e) => {
              const cpa = costPerAttendee(e);
              return (
                <tr key={e.id}>
                  <td style={{ ...td, fontWeight: 600 }}>{e.name}</td>
                  <td style={td}>{e.format.replace("_", " ")}</td>
                  <td style={e.market ? td : tdDash}>{e.market || DASH}</td>
                  <td style={td}>{e.date}</td>
                  <td style={e.campaignCode ? { ...td, fontFamily: "var(--font-family-mono, monospace)" } : tdDash}>
                    {e.campaignCode || DASH}
                  </td>
                  {[e.invited, e.registered, e.attended, e.leads].map((v, i) => (
                    <td key={i} style={{ ...(v === null ? tdDash : td), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {v === null ? DASH : v}
                    </td>
                  ))}
                  <td style={{ ...(cpa === null ? tdDash : td), textAlign: "right" }}>{cpa === null ? DASH : usd(cpa)}</td>
                  {isOwner && (
                    <td style={{ ...td, textAlign: "right" }}>
                      <button type="button" style={opsLinkButton} onClick={() => { setError(null); setForm(formFor(e)); }}>
                        edit
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
          <button type="button" style={opsLinkButton} onClick={() => { setError(null); setForm(emptyForm()); }}>
            + Add event
          </button>
        </div>
      )}

      {isOwner && form && (
        <OpsFormCard>
          <OpsFormGrid>
            <label>
              <span style={opsFieldLabel}>Name</span>
              <input style={opsField} value={form.name} onChange={set("name")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Format</span>
              <select style={opsField} value={form.format} onChange={set("format")}>
                {EVENT_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={opsFieldLabel}>Market</span>
              <select style={opsField} value={form.market} onChange={set("market")}>
                <option value="">— not market-specific —</option>
                {MARKETS.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={opsFieldLabel}>Date</span>
              <input style={opsField} type="date" value={form.date} onChange={set("date")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Campaign code</span>
              <input style={opsField} value={form.campaignCode} onChange={set("campaignCode")} placeholder="e.g. breakfast-atl-sep" />
            </label>
            <label>
              <span style={opsFieldLabel}>Cost (USD)</span>
              <input style={opsField} type="number" min={0} step="0.01" value={form.costUsd} onChange={set("costUsd")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Invited (logged)</span>
              <input style={opsField} type="number" min={0} step={1} value={form.invited} onChange={set("invited")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Registered (logged)</span>
              <input style={opsField} type="number" min={0} step={1} value={form.registered} onChange={set("registered")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Attended (logged)</span>
              <input style={opsField} type="number" min={0} step={1} value={form.attended} onChange={set("attended")} />
            </label>
            <label>
              <span style={opsFieldLabel}>Leads (logged)</span>
              <input style={opsField} type="number" min={0} step={1} value={form.leads} onChange={set("leads")} />
            </label>
          </OpsFormGrid>

          <OpsError>{error}</OpsError>

          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 14 }}>
            <OpsSaveButton saving={saving} label={form.id ? "Save changes" : "Add event"} onClick={save} />
            <button type="button" style={opsLinkButton} onClick={() => setForm(null)}>
              cancel
            </button>
            {form.id && (
              <button type="button" style={{ ...opsLinkButton, color: SUBTLE, marginLeft: "auto" }} onClick={() => setArchived(form.id!, true)}>
                archive
              </button>
            )}
          </div>
        </OpsFormCard>
      )}

      {!form && error && <OpsError>{error}</OpsError>}

      <ArchivedList records={archived} label={(e) => `${e.name} (${e.date})`} isOwner={isOwner} onRestore={(id) => setArchived(id, false)} />
    </>
  );
}
