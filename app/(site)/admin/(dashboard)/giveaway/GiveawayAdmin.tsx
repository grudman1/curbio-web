"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonClass } from "@/app/(site)/admin/_ui/Button";
import { Field, FieldError, Input, Textarea } from "@/app/(site)/admin/_ui/Field";
import { useToast } from "@/app/(site)/admin/_ui/Toast";
import { Table, Td, Th, Thead, Tr } from "@/app/(site)/admin/_ui/v2/DataTable";
import { StatusBadge } from "@/app/(site)/admin/_ui/v2/HealthDot";
import type { DrawRecord } from "@/lib/giveaway/store";
import type { ReconcileReport } from "@/lib/giveaway/service";
import {
  addBonusAction,
  addManualEntryAction,
  countTestRecordsAction,
  deleteAllTestEntriesAction,
  deleteEntryAction,
  restoreEntryAction,
  undoBonusAction,
  lookupEntrantAction,
  reconcileAction,
  removeBonusAction,
  runDrawingAction,
  sendToAppAction,
  syncEmailListAction,
  verifyDrawingAction,
  sendTestAlertAction,
} from "./actions";

// The interactive halves of the giveaway screen. Everything here calls a
// server action that re-checks the session; nothing below is the gate.
//
// Each panel refreshes the route after a successful write rather than keeping
// its own copy of the entries — the server render is the one source of what
// the store holds, so two panels can never show two different counts.

type Tone = "success" | "warning" | "error" | "neutral";

export type EntryRow = {
  email: string;
  name: string;
  /** Full, formatted — every signed-in admin sees it (2026-10-07). */
  phone: string;
  /** Digits only, for searching by the last 4. */
  phoneDigits: string;
  /** Typed in on this screen (booth / written request). */
  manual: boolean;
  method: "booth" | "written" | null;
  addedBy: string | null;
  deleted: boolean;
  deletedBy: string | null;
  /** In the entry period, no bonus yet, not deleted: the +5 button shows. */
  canBonus: boolean;
  market: string;
  inMarket: boolean;
  answer: string;
  entries: number;
  bonus: "booking" | "booth" | "written" | null;
  bonusBy: string | null;
  booked: "page" | "reconcile" | null;
  entered: string;
  inDrawing: boolean;
  afterClose: boolean;
  isTest: boolean;
  revisions: number;
  /** The app status, or "due" for someone who should be with an HSM and has
   *  no attempt on record. */
  app: string;
  appDetail: string;
  /** The app's estimate id for this person, when it gave one. */
  estimateId: number | null;
  /** In a market, not a Curbio address, and not already in the app. */
  canSend: boolean;
  emailList: string;
  emailListDetail: string;
};

const APP_BADGE: Record<string, { label: string; tone: Tone; title: string }> = {
  sent: { label: "app", tone: "success", title: "Sent to the app — an HSM has it." },
  failed: { label: "app failed", tone: "error", title: "The app refused it. Not retried automatically." },
  sending: {
    label: "app unconfirmed",
    tone: "error",
    title: "A hand-off started and never reported back, so the app may or may not have this person. Look for them in the app, then use Retry.",
  },
  due: { label: "app pending", tone: "warning", title: "Should be with an HSM and has not been sent. Use Send to app." },
  sandbox: { label: "app (sandbox)", tone: "warning", title: "Would be sent to the app in production." },
  not_configured: { label: "app not configured", tone: "warning", title: "No app endpoint in this environment." },
};

const LIST_BADGE: Record<string, { label: string; tone: Tone; title: string }> = {
  synced: { label: "email list", tone: "success", title: "On the list and tagged." },
  pending: { label: "list pending", tone: "warning", title: "Due to be added — not done yet." },
  failed: { label: "list failed", tone: "error", title: "ActiveCampaign refused or could not be reached. Retry from the Email list card." },
  unsubscribed: { label: "unsubscribed", tone: "neutral", title: "They opted out before, so they were left alone." },
  not_configured: { label: "list not configured", tone: "warning", title: "No ActiveCampaign credentials in this environment." },
  sandbox: { label: "email list (sandbox)", tone: "warning", title: "Would be added to the email list in production." },
};

const BONUS_LABEL: Record<string, string> = {
  booking: "booked a call",
  booth: "booth visit",
  written: "written request",
};

// ── Bonus tool (any signed-in admin) ─────────────────────────────────────────

export function BonusTool({
  slug,
  bonusEntries,
  closed,
  isOwner,
}: {
  slug: string;
  bonusEntries: number;
  closed: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<{ firstName: string; market: string | null; entries: number; hasBonus: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFound(null);
    startTransition(async () => {
      const res = await lookupEntrantAction(slug, email);
      if (res.ok) setFound(res);
      else setError(res.error);
    });
  }

  function add(source: "booth" | "written") {
    startTransition(async () => {
      const res = await addBonusAction(slug, email, source);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("success", res.already ? "They already had the bonus — nothing changed." : `Added. They now have ${res.entries} entries.`);
      setFound(null);
      setEmail("");
      router.refresh();
    });
  }

  if (closed && !isOwner) {
    return <p className="m-0 font-sans text-ops-body text-content-muted">The entry period has closed.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={lookup} className="flex flex-wrap items-end gap-2">
        <Field label="Entrant's email" className="min-w-[220px] flex-1">
          <Input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFound(null);
            }}
            placeholder="agent@exprealty.com"
            className="h-[40px]"
          />
        </Field>
        <Button type="submit" variant="primary" disabled={busy || !email.trim()} className="h-[40px]">
          Look up
        </Button>
      </form>
      <FieldError>{error}</FieldError>
      {found && (
        <div className="flex flex-col gap-2.5 rounded-md bg-app-well px-3 py-3">
          <p className="m-0 font-sans text-ops-body text-content">
            <strong>{found.firstName}</strong> · {found.market ?? "market not listed"} · {found.entries}{" "}
            {found.entries === 1 ? "entry" : "entries"}
          </p>
          {found.hasBonus ? (
            <p className="m-0 font-sans text-ops-body text-content-muted">Already has the bonus. It is awarded once.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={busy} onClick={() => add("booth")} className="h-[40px]">
                +{bonusEntries} · visited the booth
              </Button>
              <Button disabled={busy} onClick={() => add("written")} className="h-[40px]">
                +{bonusEntries} · written request
              </Button>
            </div>
          )}
          {closed && (
            <p className="m-0 font-sans text-ops-label text-content-muted">
              The entry period has closed — only add a bonus that was earned before the deadline.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Entries table ────────────────────────────────────────────────────────────

const UNDO_MS = 10_000;

export function EntriesTable({
  slug,
  rows,
  sandbox,
  frozen,
  bonusEntries,
  deletedView,
}: {
  slug: string;
  rows: EntryRow[];
  sandbox: boolean;
  /** The official drawing has run: delete and restore are off. */
  frozen: boolean;
  bonusEntries: number;
  /** Showing the "Deleted" filter: rows offer Restore instead of Delete. */
  deletedView: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [busy, startTransition] = useTransition();
  const [undo, setUndo] = useState<{ email: string; name: string; entries: number; timer: number } | null>(null);

  // Live filter: name, email, market, app ID, or the phone's digits (last 4).
  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const shown = q
    ? rows.filter(
        (r) =>
          `${r.name} ${r.email} ${r.market} ${r.estimateId ?? ""}`.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && r.phoneDigits.endsWith(qDigits))
      )
    : rows;

  function send(row: EntryRow) {
    const retry = row.app === "failed" || row.app === "sending";
    const question = retry
      ? `Send ${row.name} to the app again?\n\nThe first attempt ${row.app === "failed" ? "failed" : "never reported back"}. If it actually reached the app, this makes a second deal — check the app first.`
      : `Send ${row.name} to the app now?\n\nAn HSM is assigned, and ${row.name.split(" ")[0]} gets the HSM's welcome email.`;
    if (!window.confirm(question)) return;
    startTransition(async () => {
      const res = await sendToAppAction(slug, row.email);
      toast(res.ok ? "success" : "error", res.ok ? (sandbox ? "Sandbox: marked, nothing sent." : "Sent to the app.") : res.error);
      router.refresh();
    });
  }

  function dropBonus(row: EntryRow) {
    const why = window.prompt(`Remove the bonus from ${row.name}? Say why — it goes in the log.`);
    if (!why?.trim()) return;
    startTransition(async () => {
      const res = await removeBonusAction(slug, row.email, why);
      toast(res.ok ? "success" : "error", res.ok ? "Bonus removed." : res.error);
      router.refresh();
    });
  }

  function plusFive(row: EntryRow) {
    startTransition(async () => {
      const res = await addBonusAction(slug, row.email, "booth");
      if (!res.ok) {
        toast("error", res.error);
        return;
      }
      if (res.already) {
        toast("success", `${row.name} already had the bonus — nothing changed.`);
        return;
      }
      if (undo) window.clearTimeout(undo.timer);
      const timer = window.setTimeout(() => setUndo(null), UNDO_MS);
      setUndo({ email: row.email, name: row.name, entries: res.entries, timer });
      router.refresh();
    });
  }

  function undoPlusFive() {
    if (!undo) return;
    const { email, name, timer } = undo;
    window.clearTimeout(timer);
    setUndo(null);
    startTransition(async () => {
      const res = await undoBonusAction(slug, email);
      toast(res.ok ? "success" : "error", res.ok ? `Undone — ${name} is back to 1 entry.` : res.error);
      router.refresh();
    });
  }

  function remove(row: EntryRow) {
    const how = row.isTest
      ? "This is a TEST entry: it is deleted for good, with its rows on the Leads screen (a backup copy is kept)."
      : "It comes off the list and out of the drawing. Its lead records are kept, and it can be restored from “Deleted”.";
    if (!window.confirm(`Delete this entry?\n\n${row.name}\n${row.email}\n\n${how}`)) return;
    startTransition(async () => {
      const res = await deleteEntryAction(slug, row.email, row.isTest);
      toast(
        res.ok ? "success" : "error",
        res.ok
          ? res.hard
            ? `Deleted ${row.name} for good (${res.leadRows ?? 0} lead row${res.leadRows === 1 ? "" : "s"} removed). Backup: ${res.backupKey}`
            : `Deleted ${row.name}. Restore it from “Deleted”.`
          : res.error
      );
      router.refresh();
    });
  }

  function restore(row: EntryRow) {
    if (!window.confirm(`Restore ${row.name} (${row.email})? They go back on the list and into the drawing.`)) return;
    startTransition(async () => {
      const res = await restoreEntryAction(slug, row.email);
      toast(res.ok ? "success" : "error", res.ok ? `Restored ${row.name}.` : res.error);
      router.refresh();
    });
  }

  const badges = (r: EntryRow) => {
    const app = APP_BADGE[r.app];
    const list = LIST_BADGE[r.emailList];
    return (
      <span className="inline-flex flex-wrap gap-1">
        {app && <StatusBadge status={app.label} tone={app.tone} title={`${app.title} ${r.appDetail}`.trim()} />}
        {r.estimateId !== null && (
          <span className="ops-subtle ops-tnum self-center whitespace-nowrap" title="The ID the app gave this lead. Search it in the app to find the deal.">
            app ID {r.estimateId}
          </span>
        )}
        {r.manual ? (
          <StatusBadge status="No email consent" tone="neutral" title="Typed in by staff — never added to the email list." />
        ) : (
          list && <StatusBadge status={list.label} tone={list.tone} title={`${list.title} ${r.emailListDetail}`.trim()} />
        )}
        {!app && !list && !r.manual && <span className="ops-subtle">—</span>}
      </span>
    );
  };

  const nameTags = (r: EntryRow) => (
    <>
      {r.isTest && <StatusBadge status="ours" tone="neutral" title="One of ours — a test entry or a Curbio address. Never drawn." />}
      {r.manual && (
        <StatusBadge
          status={r.method === "written" ? "manual · written" : "manual · booth"}
          tone="neutral"
          title={`Added on this screen${r.addedBy ? ` by ${r.addedBy}` : ""}.`}
        />
      )}
      {r.afterClose && !r.isTest && (
        <StatusBadge status="after close" tone="neutral" title="Submitted after the entry period ended. Not in the drawing." />
      )}
      {r.deleted && <StatusBadge status="deleted" tone="warning" title={`Deleted${r.deletedBy ? ` by ${r.deletedBy}` : ""}.`} />}
      {r.revisions > 0 && (
        <span className="ops-subtle" title={`Re-submitted ${r.revisions} time${r.revisions === 1 ? "" : "s"} — still one entry.`}>
          ×{r.revisions + 1}
        </span>
      )}
    </>
  );

  const actions = (r: EntryRow, big = false) => {
    const size = big ? "md" : "sm";
    const tap = big ? " min-h-[44px] px-4" : "";
    return (
      <>
        {!deletedView && r.canBonus && (
          <button type="button" disabled={busy} onClick={() => plusFive(r)} className={buttonClass("primary", size) + tap}>
            +{bonusEntries}
          </button>
        )}
        {!deletedView && r.canSend && (
          <button type="button" disabled={busy} onClick={() => send(r)} className={buttonClass("ghost", size) + tap}>
            {r.app === "failed" || r.app === "sending" ? "Retry app" : "Send to app"}
          </button>
        )}
        {!deletedView && r.bonus && (
          <button type="button" disabled={busy} onClick={() => dropBonus(r)} className={buttonClass("ghost", size) + tap}>
            Remove bonus
          </button>
        )}
        {deletedView ? (
          <button
            type="button"
            disabled={busy || frozen}
            title={frozen ? "The official drawing has run — the list is frozen." : undefined}
            onClick={() => restore(r)}
            className={buttonClass("ghost", size) + tap}
          >
            Restore
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || frozen}
            title={frozen ? "The official drawing has run — the list is frozen." : undefined}
            onClick={() => remove(r)}
            className={buttonClass("ghost", size) + tap}
          >
            Delete
          </button>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, phone (last 4), market or app ID"
        aria-label="Search entries"
        className="h-[44px] w-full md:max-w-[360px]"
      />

      {/* Phones: stacked cards, no sideways scrolling. */}
      <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden">
        {shown.map((r) => (
          <li key={r.email} className="rounded-md border border-app-border bg-surface-raised p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 font-sans text-ops-body font-semibold text-content">
                  <span className="break-words">{r.name}</span>
                  {nameTags(r)}
                </div>
                <div className="break-all font-sans text-ops-body text-content-muted">{r.email}</div>
                <div className="font-sans text-ops-body text-content-muted ops-tnum">{r.phone}</div>
              </div>
              <div className="flex-none text-right">
                <div className="ops-tnum font-sans text-[22px] font-bold leading-none text-content">{r.entries}</div>
                <div className="ops-subtle">{r.entries === 1 ? "entry" : "entries"}</div>
              </div>
            </div>
            <div className="mt-1.5 font-sans text-ops-body text-content">
              {r.market} · {r.answer}
            </div>
            <div className="mt-1.5">{badges(r)}</div>
            <div className="mt-2.5 flex flex-wrap gap-2">{actions(r, true)}</div>
          </li>
        ))}
      </ul>

      {/* Tablet and up: the table. */}
      <div className="hidden md:block">
        <Table>
          <Thead>
            <Th>Entered (MT)</Th>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th>Market</Th>
            <Th>90 days</Th>
            <Th align="right">Entries</Th>
            <Th>Went to</Th>
            <Th align="right"> </Th>
          </Thead>
          <tbody>
            {shown.map((r) => (
              <Tr key={r.email}>
                <Td muted className="whitespace-nowrap">
                  {r.entered}
                </Td>
                <Td className="font-semibold">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {r.name}
                    {nameTags(r)}
                  </span>
                </Td>
                <Td>{r.email}</Td>
                <Td muted numeric className="whitespace-nowrap">
                  {r.phone}
                </Td>
                <Td muted={!r.inMarket}>{r.market}</Td>
                <Td>{r.answer}</Td>
                <Td
                  align="right"
                  numeric
                  title={
                    r.bonus
                      ? `Bonus: ${BONUS_LABEL[r.bonus]}${r.bonusBy ? ` — added by ${r.bonusBy}` : ""}${
                          r.booked === "page" ? " (reported by the page — check against Calendly)" : ""
                        }`
                      : "No bonus."
                  }
                >
                  {r.entries}
                  {r.bonus && <span className="ops-subtle"> · {BONUS_LABEL[r.bonus]}</span>}
                </Td>
                <Td>{badges(r)}</Td>
                <Td align="right" className="whitespace-nowrap">
                  <span className="inline-flex gap-1">{actions(r)}</span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      {q && shown.length === 0 && <p className="m-0 ops-subtle">No entries match “{query}”.</p>}

      {undo && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 items-center justify-between gap-3 rounded-lg bg-surface-inverse px-4 py-3 font-sans text-ops-body text-content-inverse shadow-lg"
        >
          <span>
            Added +{bonusEntries} for {undo.name}, now {undo.entries} entries
          </span>
          <button type="button" onClick={undoPlusFive} className="min-h-[44px] flex-none px-2 font-bold underline underline-offset-2">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Delete all test entries ──────────────────────────────────────────────────

export function DeleteAllTests({ slug, frozen }: { slug: string; frozen: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  function run() {
    startTransition(async () => {
      const c = await countTestRecordsAction(slug);
      if (!c.ok) {
        toast("error", c.error);
        return;
      }
      if (c.entries + c.waitlist === 0) {
        toast("success", "There are no test entries to delete.");
        return;
      }
      const ok = window.confirm(
        `Delete all test entries for good?\n\n${c.entries} test entr${c.entries === 1 ? "y" : "ies"} (“ours”), with their rows on the Leads screen\n${c.waitlist} ZZTEST waitlist sign-up${c.waitlist === 1 ? "" : "s"}\n\nA backup copy is kept. The CRM is not touched.`
      );
      if (!ok) return;
      const res = await deleteAllTestEntriesAction(slug);
      toast(
        res.ok ? "success" : "error",
        res.ok
          ? `Deleted ${res.entries} test entries (${res.leadRows} lead rows) and ${res.waitlist} waitlist sign-ups. Backup: ${res.backupKey}`
          : res.error
      );
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      disabled={busy || frozen}
      title={frozen ? "The official drawing has run — the list is frozen." : undefined}
      onClick={run}
      className={buttonClass("ghost", "sm")}
    >
      Delete all test entries
    </button>
  );
}

// ── Add entry (booth / written request) ──────────────────────────────────────

const NOT_LISTED = "not-listed";

export function AddEntryForm({
  slug,
  bonusEntries,
  closed,
  markets,
}: {
  slug: string;
  bonusEntries: number;
  closed: boolean;
  markets: { slug: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const blank = {
    name: "",
    email: "",
    phone: "",
    market: "",
    zip: "",
    listing90: "",
    method: "booth" as "booth" | "written",
    addBonus: true,
    contactConsent: false,
  };
  const [f, setF] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ email: string; name: string; entries: number; hasBonus: boolean; deleted: boolean } | null>(null);
  const [busy, startTransition] = useTransition();
  // Phones: the form is folded behind one button so search and +5 stay near
  // the top of the screen. Tablet and up: always open.
  const [open, setOpen] = useState(false);
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setExisting(null);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExisting(null);
    startTransition(async () => {
      const res = await addManualEntryAction(slug, { ...f, zip: f.market === NOT_LISTED ? f.zip : "" });
      if (res.ok) {
        toast(
          "success",
          `Added ${res.name} — ${res.entries} ${res.entries === 1 ? "entry" : "entries"}${res.inEntryPeriod ? "" : " (after the close: not in the drawing)"}${
            res.app === "sent" ? " · sent to the app" : res.app === "sandbox" ? " · app (sandbox)" : ""
          }.`
        );
        setF(blank);
        router.refresh();
        return;
      }
      if (res.existing) setExisting(res.existing);
      setError(res.error);
    });
  }

  function plusFiveExisting() {
    if (!existing) return;
    startTransition(async () => {
      const res = await addBonusAction(slug, existing.email, f.method);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("success", res.already ? `${existing.name} already had the bonus.` : `Added +${bonusEntries} for ${existing.name}, now ${res.entries} entries.`);
      setExisting(null);
      setError(null);
      setF(blank);
      router.refresh();
    });
  }

  const label = "font-sans text-ops-label font-semibold text-content";
  const control = "h-[44px] w-full rounded-md border border-app-border bg-surface-raised px-3 font-sans text-[16px] text-content";
  return (
    <>
    <Button
      variant={open ? "secondary" : "primary"}
      onClick={() => setOpen((v) => !v)}
      className="min-h-[44px] w-full md:hidden"
      aria-expanded={open}
    >
      {open ? "Close" : "Add entry"}
    </Button>
    <form onSubmit={submit} className={`${open ? "mt-3 flex" : "hidden"} flex-col gap-3 md:mt-0 md:flex`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={label}>Name</span>
          <input className={control} value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Email</span>
          <input
            className={control}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            value={f.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Phone</span>
          <input className={control} type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Market</span>
          <select className={control} value={f.market} onChange={(e) => set("market", e.target.value)} required>
            <option value="">Select a market</option>
            {markets.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.label}
              </option>
            ))}
            <option value={NOT_LISTED}>Not listed</option>
          </select>
        </label>
        {f.market === NOT_LISTED && (
          <label className="flex flex-col gap-1">
            <span className={label}>ZIP code</span>
            <input className={control} inputMode="numeric" maxLength={10} value={f.zip} onChange={(e) => set("zip", e.target.value)} required />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className={label}>Listing in next 90 days</span>
          <select className={control} value={f.listing90} onChange={(e) => set("listing90", e.target.value)} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="not_yet">Not yet</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>Method</span>
          <select className={control} value={f.method} onChange={(e) => set("method", e.target.value as "booth" | "written")}>
            <option value="booth">Booth</option>
            <option value="written">Written request</option>
          </select>
        </label>
      </div>
      <label className="flex min-h-[44px] items-center gap-2.5 font-sans text-ops-body text-content">
        <input type="checkbox" className="h-5 w-5" checked={f.addBonus} onChange={(e) => set("addBonus", e.target.checked)} />
        Add +{bonusEntries} (booth visit)
      </label>
      <label className="flex min-h-[44px] items-center gap-2.5 font-sans text-ops-body text-content">
        <input type="checkbox" className="h-5 w-5" checked={f.contactConsent} onChange={(e) => set("contactConsent", e.target.checked)} />
        They asked a Curbio manager to contact them
      </label>
      {closed && (
        <p className="m-0 font-sans text-ops-label text-content-muted">
          The entry period has closed: entries added now are saved but are not in the drawing.
        </p>
      )}
      <FieldError>{error}</FieldError>
      {existing && (
        <div className="flex flex-col gap-2 rounded-md bg-app-well px-3 py-3 font-sans text-ops-body text-content">
          <span>
            <strong>{existing.name}</strong> ({existing.email}) already has {existing.entries}{" "}
            {existing.entries === 1 ? "entry" : "entries"}
            {existing.deleted ? " — the entry is deleted; restore it from “Deleted”." : "."}
          </span>
          {!existing.deleted &&
            (existing.hasBonus ? (
              <span className="text-content-muted">They already have the bonus. It is awarded once.</span>
            ) : (
              <Button variant="primary" disabled={busy} onClick={plusFiveExisting} className="min-h-[44px] self-start">
                Add +{bonusEntries} instead
              </Button>
            ))}
        </div>
      )}
      <Button type="submit" variant="primary" disabled={busy} className="min-h-[44px] self-start px-6">
        {busy ? "Saving…" : "Add entry"}
      </Button>
    </form>
    </>
  );
}

// ── Email list (owner) ───────────────────────────────────────────────────────

export function EmailListPanel({
  slug,
  outstanding,
  configured,
  sandbox,
  unsubscribed,
  tag,
  notConfiguredRows = 0,
}: {
  slug: string;
  outstanding: number;
  configured: boolean;
  sandbox: boolean;
  unsubscribed: number;
  tag: string;
  /** Entries waiting only because ActiveCampaign is not set up — said here,
   *  once, instead of a pill on every row. */
  notConfiguredRows?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The server works through a few entrants per call — each is several
  // requests to a rate-limited API — so the screen asks again until none are
  // left. Three things end the run: nothing left, a call that got nowhere, or
  // an error. Each entrant is attempted ONCE per run (the server skips anyone
  // tried since `runStartedAt`), so a contact that keeps failing cannot keep
  // the run going or keep the people behind it waiting.
  async function syncAll() {
    setBusy(true);
    const runStartedAt = new Date().toISOString();
    let synced = 0;
    let failed = 0;
    try {
      for (let call = 0; call < 1000; call++) {
        const res = await syncEmailListAction(slug, runStartedAt);
        if (!res.ok) {
          toast("error", res.error);
          return;
        }
        synced += res.synced;
        failed += res.failed;
        setProgress(`${synced} added${failed ? `, ${failed} failed` : ""}, ${res.remaining} to go`);
        if (res.remaining === 0 || res.synced + res.failed === 0) break;
      }
      toast(
        failed ? "error" : "success",
        failed
          ? `Email list: ${synced} added, ${failed} failed. The failures are under “Needs attention”.`
          : `Email list: ${synced} added.`
      );
    } catch {
      toast("error", "The sync was interrupted. Press Sync now to carry on where it stopped.");
    } finally {
      setBusy(false);
      setProgress(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {sandbox ? (
        <p className="m-0 font-sans text-ops-body text-content-muted">
          Sandbox: entries are marked as they would be routed, and nothing is sent to ActiveCampaign.
        </p>
      ) : !configured ? (
        <p className="m-0 font-sans text-ops-body text-tone-bad">
          ActiveCampaign is not configured here
          {notConfiguredRows > 0 ? ` — ${notConfiguredRows} ${notConfiguredRows === 1 ? "entry is" : "entries are"} waiting` : ""}.
          Entries are being kept; add ACTIVECAMPAIGN_ACCOUNT_URL and ACTIVECAMPAIGN_API_KEY in Vercel, redeploy, then
          sync.
        </p>
      ) : (
        <p className="m-0 font-sans text-ops-body text-content">
          {outstanding === 0 ? "Everyone due on the list is on it." : `${outstanding} waiting to be added.`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={syncAll} disabled={busy || sandbox || !configured || outstanding === 0}>
          {busy ? "Syncing…" : "Sync now"}
        </Button>
        {progress && <span className="ops-subtle ops-tnum">{progress}</span>}
      </div>
      <p className="m-0 font-sans text-ops-label text-content-muted">
        Tag <span className="font-mono">{tag}</span>
        {unsubscribed > 0 && ` · ${unsubscribed} left alone (previously unsubscribed)`}
      </p>
    </div>
  );
}

// ── Reconcile bookings (owner) ───────────────────────────────────────────────

export function ReconcilePanel({ slug }: { slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pasted, setPasted] = useState("");
  const [report, setReport] = useState<(ReconcileReport & { found: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function run(apply: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await reconcileAction(slug, pasted, apply);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // After a Record the report is re-read from the store, so it shows what
      // is true now: anyone still under "not yet recorded" is still to do.
      setReport({ ...res.report, found: res.found });
      if (apply) {
        const left = res.report.matched.length;
        toast(
          "success",
          `${res.recorded} booking${res.recorded === 1 ? "" : "s"} recorded.${left ? ` ${left} to go — press Record again.` : ""}`
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 font-sans text-ops-label text-content-muted">
        Paste every manager&apos;s export together, in one go. Leave out cancelled meetings and anything booked after
        the deadline — everyone in the paste who entered gets the bonus.
      </p>
      <Field label="Paste Calendly's invitee list — a CSV export or just the emails">
        <Textarea
          value={pasted}
          onChange={(e) => {
            setPasted(e.target.value);
            setReport(null);
          }}
          rows={4}
          placeholder="agent@exprealty.com, another@exprealty.com …"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run(false)} disabled={busy || !pasted.trim()}>
          Check
        </Button>
        {report && report.matched.length > 0 && (
          <Button variant="primary" onClick={() => run(true)} disabled={busy}>
            Record {report.matched.length} booking{report.matched.length === 1 ? "" : "s"}
          </Button>
        )}
      </div>
      <FieldError>{error}</FieldError>
      {report && (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 font-sans text-ops-body">
          <ReportLine label="Emails found in the paste" emails={null} count={report.found} />
          <ReportLine label="Already recorded as booked" emails={report.confirmed} />
          <ReportLine label="Booked, bonus not yet recorded" emails={report.matched} strong />
          <ReportLine label="Booked but never entered" emails={report.notEntered} />
          <ReportLine label="Bonus rests on a booking that is not in this paste" emails={report.unverified} warn />
        </dl>
      )}
      {report && report.unverified.length > 0 && (
        <p className="m-0 font-sans text-ops-label text-content-muted">
          These people hold the bonus because the page reported a booking. It may still be real — booked under a
          different email, or in an export that is not pasted here. Check, then use “Remove bonus” on the row if it is
          not.
        </p>
      )}
    </div>
  );
}

function ReportLine({
  label,
  emails,
  count,
  strong,
  warn,
}: {
  label: string;
  emails: string[] | null;
  count?: number;
  strong?: boolean;
  warn?: boolean;
}) {
  const n = count ?? emails?.length ?? 0;
  return (
    <>
      <dt className={`ops-tnum text-right ${warn && n ? "font-bold text-tone-bad" : strong && n ? "font-bold text-content" : "text-content-muted"}`}>
        {n}
      </dt>
      <dd className="m-0 min-w-0">
        <span className="text-content">{label}</span>
        {emails && emails.length > 0 && <span className="block break-all text-content-muted">{emails.join(", ")}</span>}
      </dd>
    </>
  );
}

// ── The drawing (owner) ──────────────────────────────────────────────────────

export function DrawPanel({
  slug,
  closed,
  winners,
  kitName,
  draws,
  eligiblePeople,
  notify,
}: {
  slug: string;
  closed: boolean;
  /** How many people are drawn. Each wins the same whole kit. */
  winners: number;
  kitName: string;
  draws: DrawRecord[];
  eligiblePeople: number;
  notify: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  const [verified, setVerified] = useState<Record<string, string>>({});
  const official = draws.filter((d) => d.mode === "official");

  function run(mode: "official" | "practice") {
    let note = "";
    if (mode === "official") {
      if (official.length > 0) {
        note = window.prompt("An official drawing is already on record. Why is another needed?") ?? "";
        if (!note.trim()) return;
      }
      const ok = window.confirm(
        `Run the OFFICIAL drawing now?\n\n${eligiblePeople} people are eligible. ${winners} winners (each gets the ${kitName}) and their alternates will be drawn and recorded. This cannot be undone.`
      );
      if (!ok) return;
    }
    startTransition(async () => {
      const res = await runDrawingAction(slug, mode, note);
      toast(res.ok ? "success" : "error", res.ok ? (mode === "official" ? "Drawing recorded." : "Practice drawing recorded.") : res.error);
      router.refresh();
    });
  }

  function verify(id: string) {
    startTransition(async () => {
      const res = await verifyDrawingAction(slug, id);
      setVerified((v) => ({
        ...v,
        [id]: !res.ok ? res.error : res.verified ? "Verified: the same seed over the frozen list gives the same names." : `NOT verified. ${res.reason ?? ""}`,
      }));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={busy || !closed || eligiblePeople === 0} onClick={() => run("official")}>
          Run the official drawing
        </Button>
        <Button disabled={busy || eligiblePeople === 0} onClick={() => run("practice")}>
          Practice drawing
        </Button>
        <span className="ops-subtle">
          {closed
            ? `${eligiblePeople} eligible`
            : `${eligiblePeople} eligible so far · the official drawing unlocks when the entry period closes`}
        </span>
      </div>

      {draws.length === 0 ? (
        <p className="m-0 ops-subtle">No drawing has been run.</p>
      ) : (
        draws.map((d) => (
          <div key={d.id} className="rounded-md border border-app-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={d.mode}
                tone={d.mode === "official" ? "success" : "neutral"}
                title={d.mode === "official" ? "The drawing of record." : "A rehearsal. Not the drawing."}
              />
              <span className="font-sans text-ops-body font-semibold text-content">
                {new Date(d.ranAt).toLocaleString("en-US", { timeZone: "America/Denver", dateStyle: "medium", timeStyle: "short" })} MT
              </span>
              <span className="ops-subtle">
                by {d.ranBy} · {d.eligiblePeople} people · {d.totalEntries} entries
              </span>
              <span className="ml-auto inline-flex gap-1.5">
                <button type="button" disabled={busy} onClick={() => verify(d.id)} className={buttonClass("ghost", "sm")}>
                  Verify
                </button>
                <a
                  href={`/api/admin/giveaway/draw?giveaway=${slug}&id=${d.id}`}
                  download
                  className={buttonClass("ghost", "sm")}
                >
                  Download record
                </a>
              </span>
            </div>
            {d.note && <p className="m-0 mt-1.5 font-sans text-ops-label text-content-muted">Note: {d.note}</p>}
            {verified[d.id] && (
              <p className={`m-0 mt-1.5 font-sans text-ops-label font-semibold ${verified[d.id].startsWith("Verified") ? "text-tone-good" : "text-tone-bad"}`}>
                {verified[d.id]}
              </p>
            )}

            <p className="m-0 mt-2 font-sans text-ops-label text-content-muted">
              All {d.winners.length} winners receive the same whole {kitName}. The order drawn assigns nothing; it is
              recorded because the seed reproduces the names in exactly this order. Alternates step in in order.
            </p>
            <Table className="mt-2">
              <Thead>
                <Th>Drawn</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th align="right">Entries</Th>
              </Thead>
              <tbody>
                {d.winners.map((w, i) => (
                  <Tr key={w.email}>
                    <Td numeric>
                      <span className="font-semibold">Winner</span> {i + 1}
                    </Td>
                    <Td className="font-semibold">{w.name}</Td>
                    <Td>{w.email}</Td>
                    <Td numeric className="whitespace-nowrap">{w.phone}</Td>
                    <Td align="right" numeric>{w.entries}</Td>
                  </Tr>
                ))}
                {d.alternates.map((a) => (
                  <Tr key={a.email}>
                    <Td numeric muted>alt {a.order}</Td>
                    <Td muted>{a.name}</Td>
                    <Td muted>{a.email}</Td>
                    <Td numeric muted className="whitespace-nowrap">{a.phone}</Td>
                    <Td align="right" numeric muted>{a.entries}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <p className="m-0 mt-2 break-all font-mono text-[11.5px] leading-[1.5] text-content-muted">
              seed {d.seed} · list {d.snapshotHash} · {d.algorithm}
              {d.excluded.tests + d.excluded.afterClose > 0 &&
                ` · excluded: ${d.excluded.tests} test, ${d.excluded.afterClose} after close`}
            </p>
          </div>
        ))
      )}
      {official.length > 0 && <p className="m-0 font-sans text-ops-label text-content-muted">{notify}</p>}
    </div>
  );
}

// ── Failure alerts (owner) ───────────────────────────────────────────────────

/** Where "CRM delivery FAILED" emails go, and a button that proves they arrive:
 *  it sends a clearly-labelled TEST through the same path and shows what the
 *  email service answered. */
export function AlertTest({
  slug,
  to,
  source,
  configured,
}: {
  slug: string;
  to: string;
  source: string;
  configured: boolean;
}) {
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function send() {
    setResult(null);
    startTransition(async () => {
      const res = await sendTestAlertAction(slug);
      if (res.ok) {
        setResult({ ok: true, text: `Accepted by the email service for ${res.to}. Now check that inbox (and spam): if it arrives, real alerts will too.` });
        toast("success", "Test alert sent.");
      } else {
        setResult({ ok: false, text: `Not sent${"to" in res ? ` to ${res.to}` : ""}: ${res.error}` });
        toast("error", "The test alert failed.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 font-sans text-ops-body text-content">
        When a lead cannot be delivered to the app, an email goes to <strong className="break-all">{to}</strong>{" "}
        <span className="text-content-muted">(from {source})</span>.
      </p>
      {!configured && (
        <p className="m-0 rounded-md bg-pill-bad-bg px-3 py-2 font-sans text-ops-body font-semibold text-pill-bad-fg">
          No email key is set in this environment, so no alert can be sent.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={send} disabled={busy || !configured}>
          {busy ? "Sending…" : "Send a test alert"}
        </Button>
      </div>
      {result && (
        <p
          role="status"
          className={`m-0 rounded-md px-3 py-2 font-sans text-ops-body font-semibold ${
            result.ok ? "bg-pill-good-bg text-pill-good-fg" : "bg-pill-bad-bg text-pill-bad-fg"
          }`}
        >
          {result.text}
        </p>
      )}
      <p className="m-0 font-sans text-ops-label text-content-muted">
        Alerts are sent from Resend&apos;s shared test address. Until a Curbio domain is verified in Resend, it may
        deliver only to the Resend account owner&apos;s own address — this test tells you whether yours does.
      </p>
    </div>
  );
}
