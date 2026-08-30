"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionsTd, IconButton, Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { InlineNumberCell, InlineSelectCell } from "@/app/(site)/admin/_ui/InlineCell";
import { LoggedTag } from "@/app/(site)/admin/_ui/Logged";
import { useToast } from "@/app/(site)/admin/_ui/Toast";
import { Select } from "@/app/(site)/admin/_ui/Field";
import { OUTREACH_ARMS } from "@/config/marketingHub";
import type { OutreachEntry } from "@/lib/opsOutreach";
import { OutlineBar } from "@/app/(site)/admin/_ui/hubUi";
import { ArchivedNote } from "@/app/(site)/admin/_ui/ArchivedNote";
import { archiveOutreachAction, saveOutreachAction, type SaveOutreachInput } from "./actions";

// The cadence table, editable IN the table: click a number, type, Enter. The
// first edit on an empty week creates the record (default arm, other counts
// still null); every later edit updates it.
//
// Every number is LOGGED — the A/B this feeds decides which arm books face
// time, so these must never read as measured events.

export type HsmRow = { name: string; covers: string };

const ARM_OPTIONS = OUTREACH_ARMS.map((a) => ({ key: a.key, label: a.label }));

type CountField = "mailingsSent" | "callsMade" | "meetingsBooked";

function inputFor(hsm: string, weekOf: string, entry: OutreachEntry | null): SaveOutreachInput {
  return {
    id: entry?.id,
    hsm,
    weekOf,
    arm: entry?.arm ?? OUTREACH_ARMS[0].key,
    mailingsSent: entry?.mailingsSent == null ? "" : String(entry.mailingsSent),
    callsMade: entry?.callsMade == null ? "" : String(entry.callsMade),
    meetingsBooked: entry?.meetingsBooked == null ? "" : String(entry.meetingsBooked),
  };
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
  const toast = useToast();
  const [week, setWeek] = useState(weekOf);

  const byHsm = new Map(entries.filter((e) => e.weekOf === week).map((e) => [e.hsm, e]));

  async function saveField(
    hsm: string,
    entry: OutreachEntry | null,
    patch: Partial<SaveOutreachInput>
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await saveOutreachAction({ ...inputFor(hsm, week, entry), ...patch });
    if (!result.ok) return result;
    router.refresh();
    return { ok: true };
  }

  const saveCount = (hsm: string, entry: OutreachEntry | null, field: CountField) => async (next: number | null) =>
    saveField(hsm, entry, { [field]: next === null ? "" : String(next) });

  async function archive(entry: OutreachEntry) {
    const result = await archiveOutreachAction(entry.id, true);
    if (!result.ok) return toast("error", result.error);
    toast("success", `Archived ${entry.hsm} · week of ${entry.weekOf}.`);
    router.refresh();
  }

  async function restore(id: string) {
    const result = await archiveOutreachAction(id, false);
    if (!result.ok) return toast("error", result.error);
    toast("success", "Entry restored.");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2 px-ops-panel pb-3">
        <label htmlFor="cadence-week" className="font-sans text-ops-label font-semibold text-content-muted">
          Week of
        </label>
        <Select
          id="cadence-week"
          className="!w-auto"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </Select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>HSM</Th>
            <Th>Mailings this week</Th>
            <Th>Calls this week</Th>
            <Th>Arm</Th>
            <Th align="right">Meetings booked</Th>
            {isOwner && <Th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {hsms.map((h) => {
            const e = byHsm.get(h.name) ?? null;
            return (
              <Tr key={h.name}>
                <Td className="min-w-[180px]">
                  <div className="font-semibold">{h.name}</div>
                  <div className="mt-px font-sans text-ops-label text-content-subtle">{h.covers}</div>
                </Td>
                <Td className="min-w-[170px]">
                  <span className="flex items-center gap-2.5">
                    <OutlineBar
                      fraction={e?.mailingsSent != null ? e.mailingsSent / mailingsTarget : undefined}
                    />
                    <span className="w-[72px]">
                      <InlineNumberCell
                        label={`Mailings sent — ${h.name}, week of ${week}`}
                        value={e?.mailingsSent ?? null}
                        align="left"
                        disabled={!isOwner}
                        onSave={saveCount(h.name, e, "mailingsSent")}
                        format={(n) => `${n} of ${mailingsTarget}`}
                      />
                    </span>
                  </span>
                </Td>
                <Td className="min-w-[170px]">
                  <span className="flex items-center gap-2.5">
                    <OutlineBar fraction={e?.callsMade != null ? e.callsMade / callsTarget : undefined} />
                    <span className="w-[72px]">
                      <InlineNumberCell
                        label={`Calls made — ${h.name}, week of ${week}`}
                        value={e?.callsMade ?? null}
                        align="left"
                        disabled={!isOwner}
                        onSave={saveCount(h.name, e, "callsMade")}
                        format={(n) => `${n} of ${callsTarget}`}
                      />
                    </span>
                  </span>
                </Td>
                <Td className="min-w-[150px]">
                  <InlineSelectCell
                    label={`A/B arm — ${h.name}, week of ${week}`}
                    value={e?.arm ?? null}
                    options={ARM_OPTIONS}
                    disabled={!isOwner}
                    onSave={(next) => saveField(h.name, e, { arm: next })}
                  />
                </Td>
                <Td align="right" className="min-w-[130px]">
                  <InlineNumberCell
                    label={`Meetings booked — ${h.name}, week of ${week}`}
                    value={e?.meetingsBooked ?? null}
                    disabled={!isOwner}
                    onSave={saveCount(h.name, e, "meetingsBooked")}
                    suffix={<LoggedTag />}
                  />
                </Td>
                {isOwner && (
                  <ActionsTd>
                    {e && <IconButton icon="archive" label={`Archive ${h.name}'s week`} onClick={() => archive(e)} />}
                  </ActionsTd>
                )}
              </Tr>
            );
          })}
        </tbody>
      </Table>

      <ArchivedNote
        records={archived}
        label={(e) => `${e.hsm} · week of ${e.weekOf}`}
        isOwner={isOwner}
        onRestore={restore}
      />
    </>
  );
}
