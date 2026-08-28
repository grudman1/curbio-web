"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/(site)/admin/_ui/Button";
import { ActionsTd, IconButton, Table, Td, Th, Toolbar, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { Drawer, DrawerGrid } from "@/app/(site)/admin/_ui/Drawer";
import { Field, FieldError, Input, Textarea } from "@/app/(site)/admin/_ui/Field";
import { InlineNumberCell, InlineTextCell } from "@/app/(site)/admin/_ui/InlineCell";
import { LoggedTag } from "@/app/(site)/admin/_ui/Logged";
import { DASH } from "@/app/(site)/admin/_ui/primitives";
import { useToast } from "@/app/(site)/admin/_ui/Toast";
import type { Partner } from "@/lib/opsPartners";
import { ArchivedNote } from "../ArchivedNote";
import { archivePartnerAction, savePartnerAction, type SavePartnerInput } from "./actions";

// The Call Plan. Quick fields (stage, next step, owner, the two logged
// counts) edit inline in the table; the full record — dates and notes
// included — opens in the drawer. Seed rows (config PARTNER_SEED, not yet
// saved) render name + stage + dashes until their first save turns them into
// records.
//
// Editing is owner-only DISPLAY here; the real gate is ownerSession() inside
// every action. Members see the same table, minus the edit affordances.

/** A seed row not yet in the store: name + stage only, everything else DASH. */
export type PlanRow =
  | { kind: "record"; partner: Partner }
  | { kind: "seed"; name: string; stage: string };

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

function inputFor(p: Partner): SavePartnerInput {
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
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDrawer(state: FormState) {
    setError(null);
    setForm(state);
  }

  async function saveDrawer() {
    if (!form || saving) return;
    setSaving(true);
    setError(null);
    const result = await savePartnerAction(form as SavePartnerInput);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast("success", `Saved ${form.name.trim() || "partner"}.`);
    setForm(null);
    router.refresh();
  }

  /** Inline single-field save — current record + one changed field. */
  async function saveInline(p: Partner, patch: Partial<SavePartnerInput>) {
    const result = await savePartnerAction({ ...inputFor(p), ...patch });
    if (!result.ok) return result;
    router.refresh();
    return { ok: true as const };
  }

  async function setArchived(id: string, value: boolean, name: string) {
    const result = await archivePartnerAction(id, value);
    if (!result.ok) return toast("error", result.error);
    toast("success", value ? `Archived ${name}.` : `Restored ${name}.`);
    setForm(null);
    router.refresh();
  }

  const setField = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      {isOwner && (
        <Toolbar>
          <Button variant="primary" size="sm" onClick={() => openDrawer(emptyForm())}>
            Add partner
          </Button>
        </Toolbar>
      )}
      <Table>
        <thead>
          <tr>
            <Th>Partner</Th>
            <Th>Stage</Th>
            <Th>Next step</Th>
            <Th>Next step date</Th>
            <Th>Owner</Th>
            <Th align="right">Agents reached</Th>
            <Th align="right">Meetings</Th>
            {isOwner && <Th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const p = row.kind === "record" ? row.partner : null;
            const key = p ? p.id : `seed:${row.kind === "seed" ? row.name : ""}`;
            const name = p ? p.name : row.kind === "seed" ? row.name : "";
            return (
              <Tr key={key}>
                <Td className="font-semibold">
                  {name}
                  {p?.notes ? (
                    <div
                      title={p.notes}
                      className="max-w-[320px] truncate font-sans text-ops-label font-normal text-content-subtle"
                    >
                      {p.notes}
                    </div>
                  ) : null}
                </Td>
                <Td className="min-w-[130px]">
                  {p ? (
                    <InlineTextCell
                      label={`Stage — ${p.name}`}
                      value={p.stage}
                      disabled={!isOwner}
                      onSave={(next) => saveInline(p, { stage: next })}
                    />
                  ) : row.kind === "seed" ? (
                    row.stage
                  ) : (
                    DASH
                  )}
                </Td>
                <Td className="min-w-[150px]">
                  {p ? (
                    <InlineTextCell
                      label={`Next step — ${p.name}`}
                      value={p.nextStep}
                      disabled={!isOwner}
                      onSave={(next) => saveInline(p, { nextStep: next })}
                    />
                  ) : (
                    <span className="text-content-subtle">{DASH}</span>
                  )}
                </Td>
                <Td muted={!p?.nextStepDate}>{p?.nextStepDate || DASH}</Td>
                <Td className="min-w-[110px]">
                  {p ? (
                    <InlineTextCell
                      label={`Owner — ${p.name}`}
                      value={p.owner}
                      disabled={!isOwner}
                      onSave={(next) => saveInline(p, { owner: next })}
                    />
                  ) : (
                    <span className="text-content-subtle">{DASH}</span>
                  )}
                </Td>
                <Td align="right" className="min-w-[120px]">
                  {p ? (
                    <InlineNumberCell
                      label={`Agents reached — ${p.name}`}
                      value={p.agentsReached}
                      disabled={!isOwner}
                      onSave={(next) => saveInline(p, { agentsReached: next === null ? "" : String(next) })}
                      suffix={<LoggedTag />}
                    />
                  ) : (
                    <span className="text-content-subtle">{DASH}</span>
                  )}
                </Td>
                <Td align="right" className="min-w-[110px]">
                  {p ? (
                    <InlineNumberCell
                      label={`Meetings booked — ${p.name}`}
                      value={p.meetingsBooked}
                      disabled={!isOwner}
                      onSave={(next) => saveInline(p, { meetingsBooked: next === null ? "" : String(next) })}
                      suffix={<LoggedTag />}
                    />
                  ) : (
                    <span className="text-content-subtle">{DASH}</span>
                  )}
                </Td>
                {isOwner && (
                  <ActionsTd>
                    <IconButton
                      icon="edit"
                      label={p ? `Edit ${p.name}` : `Add ${name}`}
                      onClick={() => openDrawer(formFor(row))}
                    />
                    {p && (
                      <IconButton icon="archive" label={`Archive ${p.name}`} onClick={() => setArchived(p.id, true, p.name)} />
                    )}
                  </ActionsTd>
                )}
              </Tr>
            );
          })}
        </tbody>
      </Table>

      <ArchivedNote
        records={archived}
        label={(p) => `${p.name} — ${p.stage || "no stage"}`}
        isOwner={isOwner}
        onRestore={(id) => {
          const p = archived.find((a) => a.id === id);
          void setArchived(id, false, p?.name ?? "partner");
        }}
      />

      <Drawer
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? `Edit ${form.name || "partner"}` : "Add partner"}
        footer={
          <>
            <Button variant="primary" disabled={saving} onClick={saveDrawer}>
              {saving ? "Saving…" : form?.id ? "Save changes" : "Add partner"}
            </Button>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
            {form?.id && (
              <Button
                variant="danger"
                className="ml-auto"
                onClick={() => setArchived(form.id!, true, form.name)}
              >
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
                <Input value={form.name} onChange={setField("name")} />
              </Field>
              <Field label="Stage">
                <Input value={form.stage} onChange={setField("stage")} placeholder="e.g. warm, transferring" />
              </Field>
              <Field label="Owner">
                <Input value={form.owner} onChange={setField("owner")} />
              </Field>
              <Field label="Next step" className="col-span-2">
                <Input value={form.nextStep} onChange={setField("nextStep")} />
              </Field>
              <Field label="Next step date">
                <Input type="date" value={form.nextStepDate} onChange={setField("nextStepDate")} />
              </Field>
              <span aria-hidden />
              <Field label="Agents reached (logged)">
                <Input type="number" min={0} step={1} value={form.agentsReached} onChange={setField("agentsReached")} />
              </Field>
              <Field label="Meetings booked (logged)">
                <Input type="number" min={0} step={1} value={form.meetingsBooked} onChange={setField("meetingsBooked")} />
              </Field>
              <Field label="Notes" className="col-span-2">
                <Textarea value={form.notes} onChange={setField("notes")} />
              </Field>
            </DrawerGrid>
            <FieldError>{error}</FieldError>
          </>
        )}
      </Drawer>
    </>
  );
}
