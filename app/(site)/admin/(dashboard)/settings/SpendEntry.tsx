"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/(site)/admin/_ui/Button";
import { ActionsTd, IconButton, Table, Td, Th, Toolbar, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { Drawer, DrawerGrid } from "@/app/(site)/admin/_ui/Drawer";
import { Field, FieldError, Input, Select } from "@/app/(site)/admin/_ui/Field";
import { InlineNumberCell } from "@/app/(site)/admin/_ui/InlineCell";
import { LoggedTag } from "@/app/(site)/admin/_ui/Logged";
import { useToast } from "@/app/(site)/admin/_ui/Toast";
import { CHANNEL_FUNNEL_ORDER, CHANNEL_LABELS } from "@/config/marketingHub";
import { MARKETS } from "@/config/markets";
import type { SpendEntry as Entry } from "@/lib/opsSpend";
import { ArchivedNote } from "@/app/(site)/admin/_ui/ArchivedNote";
import { archiveSpendAction, saveSpendAction } from "@/app/(site)/admin/(dashboard)/settings/actions";

// Spend — a real table now: month × market × channel × amount, added from a
// drawer, amount editable in place. Typed in from invoices, so every row
// carries the logged marker.

type FormState = { id?: string; month: string; market: string; channel: string; amountUsd: string };

function emptyForm(): FormState {
  return { month: "", market: "all", channel: CHANNEL_FUNNEL_ORDER[0], amountUsd: "" };
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function marketLabel(slug: string): string {
  if (slug === "all") return "All markets";
  return MARKETS.find((m) => m.slug === slug)?.name ?? slug;
}

export function SpendEntryPanel({
  entries,
  archived,
  isOwner,
  configured,
}: {
  entries: Entry[];
  archived: Entry[];
  isOwner: boolean;
  configured: boolean;
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
    const result = await saveSpendAction(form);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    toast("success", "Spend entry saved.");
    setForm(null);
    router.refresh();
  }

  async function saveAmount(e: Entry, next: number | null) {
    if (next === null) return { ok: false as const, error: "Spend needs an amount — archive the row to remove it." };
    const result = await saveSpendAction({ id: e.id, month: e.month, market: e.market, channel: e.channel, amountUsd: String(next) });
    if (!result.ok) return result;
    router.refresh();
    return { ok: true as const };
  }

  async function setArchived(id: string, value: boolean) {
    const result = await archiveSpendAction(id, value);
    if (!result.ok) return toast("error", result.error);
    toast("success", value ? "Entry archived." : "Entry restored.");
    router.refresh();
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      {isOwner && configured && (
        <Toolbar>
          <Button variant="primary" size="sm" onClick={() => { setError(null); setForm(emptyForm()); }}>
            Add spend
          </Button>
        </Toolbar>
      )}
      {!configured && (
        <p className="m-0 px-ops-panel pb-3 font-sans text-ops-label text-content-subtle">
          Ops store not configured — entry disabled.
        </p>
      )}

      <Table>
        <thead>
          <tr>
            <Th align="right">
              <span className="inline-flex items-center gap-1">
                Amount <LoggedTag />
              </span>
            </Th>
            <Th>Month</Th>
            <Th>Market</Th>
            <Th>Channel</Th>
            {isOwner && <Th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <Td muted colSpan={isOwner ? 5 : 4}>
                {/* The consequence of an empty store is already visible as an
                    em-dash on every CAC in the product; saying it again here
                    is the coaching text this system does not carry. */}
                No spend logged yet
              </Td>
            </tr>
          )}
          {entries.map((e) => (
            <Tr key={e.id}>
              <Td align="right" className="min-w-[120px] font-semibold">
                <InlineNumberCell
                  label={`Amount — ${e.month} ${marketLabel(e.market)}`}
                  value={e.amountUsd}
                  money
                  format={usd}
                  disabled={!isOwner}
                  onSave={(next) => saveAmount(e, next)}
                />
              </Td>
              <Td>{e.month}</Td>
              <Td>{marketLabel(e.market)}</Td>
              <Td>{CHANNEL_LABELS[e.channel as keyof typeof CHANNEL_LABELS] ?? e.channel}</Td>
              {isOwner && (
                <ActionsTd>
                  <IconButton icon="archive" label="Archive this entry" onClick={() => setArchived(e.id, true)} />
                </ActionsTd>
              )}
            </Tr>
          ))}
        </tbody>
      </Table>

      <ArchivedNote
        records={archived}
        label={(e) => `${usd(e.amountUsd)} · ${e.month} · ${marketLabel(e.market)}`}
        isOwner={isOwner}
        onRestore={(id) => void setArchived(id, false)}
      />

      <Drawer
        open={form !== null}
        onClose={() => setForm(null)}
        title="Add spend"
        footer={
          <>
            <Button variant="primary" disabled={saving} onClick={saveDrawer}>
              {saving ? "Saving…" : "Add spend"}
            </Button>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </>
        }
      >
        {form && (
          <>
            <DrawerGrid>
              <Field label="Month">
                <Input type="month" value={form.month} onChange={set("month")} />
              </Field>
              <Field label="Amount (USD)">
                <Input type="number" min={0} step="0.01" placeholder="0.00" value={form.amountUsd} onChange={set("amountUsd")} />
              </Field>
              <Field label="Market">
                <Select value={form.market} onChange={set("market")}>
                  <option value="all">All markets</option>
                  {MARKETS.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Channel">
                <Select value={form.channel} onChange={set("channel")}>
                  {CHANNEL_FUNNEL_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </Field>
            </DrawerGrid>
            <FieldError>{error}</FieldError>
          </>
        )}
      </Drawer>
    </>
  );
}
