"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { LoggedTag } from "@/app/(site)/admin/_ui/Logged";
import { CHANNEL_FUNNEL_ORDER, CHANNEL_LABELS } from "@/config/marketingHub";
import { MARKETS } from "@/config/markets";
import type { SpendEntry as Entry } from "@/lib/opsSpend";
import { ArchivedList, OpsError, OpsSaveButton, opsField, opsFieldLabel, opsLinkButton } from "../opsUi";
import { archiveSpendAction, saveSpendAction } from "./actions";

// Spend entry — live. This form was disabled from the day it shipped, on the
// grounds that "an entry made now would have nowhere to go". It has somewhere
// to go now (ops:spend:v1).

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
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await saveSpendAction(form);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setForm(emptyForm());
    router.refresh();
  }

  async function setArchived(id: string, value: boolean) {
    setError(null);
    const result = await archiveSpendAction(id, value);
    if (!result.ok) return setError(result.error);
    router.refresh();
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <fieldset disabled={!isOwner || !configured} style={{ border: 0, margin: 0, padding: 0, opacity: isOwner && configured ? 1 : 0.55 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            <span style={opsFieldLabel}>Month</span>
            <input style={opsField} type="month" value={form.month} onChange={set("month")} />
          </label>
          <label>
            <span style={opsFieldLabel}>Market</span>
            <select style={opsField} value={form.market} onChange={set("market")}>
              <option value="all">All markets</option>
              {MARKETS.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={opsFieldLabel}>Channel</span>
            <select style={opsField} value={form.channel} onChange={set("channel")}>
              {CHANNEL_FUNNEL_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span style={opsFieldLabel}>Amount (USD)</span>
            <input style={opsField} type="number" min={0} step="0.01" placeholder="0.00" value={form.amountUsd} onChange={set("amountUsd")} />
          </label>
        </div>
      </fieldset>

      <OpsError>{error}</OpsError>

      {isOwner && configured && (
        <div style={{ marginTop: 12 }}>
          <OpsSaveButton saving={saving} label={form.id ? "Save entry" : "Add spend"} onClick={save} />
        </div>
      )}
      {!configured && (
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: SUBTLE, margin: "10px 0 0" }}>
          Ops store not configured — entry disabled.
        </p>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ ...opsFieldLabel, marginBottom: 0 }}>Logged spend</span>
            <LoggedTag />
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {entries.map((e) => (
              <li
                key={e.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  borderTop: "1px solid var(--color-border)",
                  padding: "6px 0",
                  fontFamily: "var(--font-family-sans)",
                  fontSize: "var(--text-small)",
                }}
              >
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{usd(e.amountUsd)}</span>
                <span style={{ color: SUBTLE }}>
                  {e.month} · {marketLabel(e.market)} · {CHANNEL_LABELS[e.channel as keyof typeof CHANNEL_LABELS] ?? e.channel}
                </span>
                {isOwner && (
                  <button type="button" style={{ ...opsLinkButton, marginLeft: "auto" }} onClick={() => setArchived(e.id, true)}>
                    archive
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ArchivedList
        records={archived}
        label={(e) => `${usd(e.amountUsd)} · ${e.month} · ${marketLabel(e.market)}`}
        isOwner={isOwner}
        onRestore={(id) => setArchived(id, false)}
      />
    </>
  );
}
