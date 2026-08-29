"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/(site)/admin/_ui/Button";
import { ActionsTd, IconButton, Table, Td, Th, Toolbar, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { Drawer, DrawerGrid } from "@/app/(site)/admin/_ui/Drawer";
import { Field, FieldError, Input, Select } from "@/app/(site)/admin/_ui/Field";
import { InlineNumberCell } from "@/app/(site)/admin/_ui/InlineCell";
import { LoggedTag } from "@/app/(site)/admin/_ui/Logged";
import { DASH } from "@/app/(site)/admin/_ui/primitives";
import { useToast } from "@/app/(site)/admin/_ui/Toast";
import { EVENT_FORMATS } from "@/config/marketingHub";
import { MARKETS } from "@/config/markets";
import { costPerAttendee, type OpsEvent } from "@/lib/opsEvents";
import { ArchivedNote } from "@/app/(site)/admin/_ui/ArchivedNote";
import { archiveEventAction, saveEventAction, type SaveEventInput } from "./actions";

// The event log. The four funnel counts edit inline in the table; the record
// itself (name, format, date, campaign code, cost) opens in the drawer. Cost
// per attendee is DERIVED and never stored, so it can never drift from its
// inputs.

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

type CountField = "invited" | "registered" | "attended" | "leads";
const COUNT_COLUMNS: { field: CountField; label: string }[] = [
  { field: "invited", label: "Invited" },
  { field: "registered", label: "Registered" },
  { field: "attended", label: "Attended" },
  { field: "leads", label: "Leads" },
];

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
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveDrawer() {
    if (!form || saving) return;
    setSaving(true);
    setError(null);
    const result = await saveEventAction(form as SaveEventInput);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    toast("success", `Saved ${form.name.trim() || "event"}.`);
    setForm(null);
    router.refresh();
  }

  async function saveCount(e: OpsEvent, field: CountField, next: number | null) {
    const result = await saveEventAction({ ...formFor(e), [field]: next === null ? "" : String(next) });
    if (!result.ok) return result;
    router.refresh();
    return { ok: true as const };
  }

  async function setArchived(id: string, value: boolean, name: string) {
    const result = await archiveEventAction(id, value);
    if (!result.ok) return toast("error", result.error);
    toast("success", value ? `Archived ${name}.` : `Restored ${name}.`);
    setForm(null);
    router.refresh();
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      {isOwner && (
        <Toolbar>
          <Button variant="primary" size="sm" onClick={() => { setError(null); setForm(emptyForm()); }}>
            Add event
          </Button>
        </Toolbar>
      )}

      <Table wide>
        <thead>
          <tr>
            <Th>Event</Th>
            <Th>Format</Th>
            <Th>Market</Th>
            <Th>Date</Th>
            <Th>Campaign code</Th>
            {/* Every count in these four columns is typed in, so the marker
                belongs on the column, not repeated in all four cells of
                every row — same rule, a quarter of the noise. */}
            {COUNT_COLUMNS.map((c) => (
              <Th key={c.field} align="right">
                <span className="inline-flex items-center gap-1">
                  {c.label} <LoggedTag />
                </span>
              </Th>
            ))}
            <Th align="right">Cost per attendee</Th>
            {isOwner && <Th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {events.length === 0 && (
            <tr>
              <Td muted colSpan={isOwner ? 11 : 10}>
                No events logged yet.
                {isOwner ? " Add the next one — the campaign code is what stops its leads landing as direct." : ""}
              </Td>
            </tr>
          )}
          {events.map((e) => {
            const cpa = costPerAttendee(e);
            return (
              <Tr key={e.id}>
                <Td className="font-semibold">{e.name}</Td>
                <Td>{e.format.replace("_", " ")}</Td>
                <Td muted={!e.market}>{e.market || DASH}</Td>
                <Td>{e.date}</Td>
                <Td muted={!e.campaignCode} className={e.campaignCode ? "font-mono text-ops-label" : ""}>
                  {e.campaignCode || DASH}
                </Td>
                {COUNT_COLUMNS.map((c) => (
                  <Td key={c.field} align="right" className="min-w-[86px]">
                    <InlineNumberCell
                      label={`${c.label} — ${e.name}`}
                      value={e[c.field]}
                      disabled={!isOwner}
                      onSave={(next) => saveCount(e, c.field, next)}
                    />
                  </Td>
                ))}
                <Td align="right" muted={cpa === null}>
                  {cpa === null ? DASH : usd(cpa)}
                </Td>
                {isOwner && (
                  <ActionsTd>
                    <IconButton icon="edit" label={`Edit ${e.name}`} onClick={() => { setError(null); setForm(formFor(e)); }} />
                    <IconButton icon="archive" label={`Archive ${e.name}`} onClick={() => setArchived(e.id, true, e.name)} />
                  </ActionsTd>
                )}
              </Tr>
            );
          })}
        </tbody>
      </Table>

      <ArchivedNote
        records={archived}
        label={(e) => `${e.name} (${e.date})`}
        isOwner={isOwner}
        onRestore={(id) => {
          const e = archived.find((a) => a.id === id);
          void setArchived(id, false, e?.name ?? "event");
        }}
      />

      <Drawer
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? `Edit ${form.name || "event"}` : "Add event"}
        footer={
          <>
            <Button variant="primary" disabled={saving} onClick={saveDrawer}>
              {saving ? "Saving…" : form?.id ? "Save changes" : "Add event"}
            </Button>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
            {form?.id && (
              <Button variant="danger" className="ml-auto" onClick={() => setArchived(form.id!, true, form.name)}>
                Archive
              </Button>
            )}
          </>
        }
      >
        {form && (
          <>
            <DrawerGrid>
              <Field label="Name" className="col-span-2">
                <Input value={form.name} onChange={set("name")} />
              </Field>
              <Field label="Format">
                <Select value={form.format} onChange={set("format")}>
                  {EVENT_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Market">
                <Select value={form.market} onChange={set("market")}>
                  <option value="">— not market-specific —</option>
                  {MARKETS.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date">
                <Input type="date" value={form.date} onChange={set("date")} />
              </Field>
              <Field label="Cost (USD)">
                <Input type="number" min={0} step="0.01" value={form.costUsd} onChange={set("costUsd")} />
              </Field>
              <Field label="Campaign code" className="col-span-2">
                <Input value={form.campaignCode} onChange={set("campaignCode")} placeholder="e.g. breakfast-atl-sep" />
              </Field>
              <Field label="Invited (logged)">
                <Input type="number" min={0} step={1} value={form.invited} onChange={set("invited")} />
              </Field>
              <Field label="Registered (logged)">
                <Input type="number" min={0} step={1} value={form.registered} onChange={set("registered")} />
              </Field>
              <Field label="Attended (logged)">
                <Input type="number" min={0} step={1} value={form.attended} onChange={set("attended")} />
              </Field>
              <Field label="Leads (logged)">
                <Input type="number" min={0} step={1} value={form.leads} onChange={set("leads")} />
              </Field>
            </DrawerGrid>
            <FieldError>{error}</FieldError>
          </>
        )}
      </Drawer>
    </>
  );
}
