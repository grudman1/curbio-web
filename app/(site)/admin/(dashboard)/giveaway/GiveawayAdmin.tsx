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
  lookupEntrantAction,
  reconcileAction,
  removeBonusAction,
  runDrawingAction,
  sendToAppAction,
  setDealNoteAction,
  syncEmailListAction,
  verifyDrawingAction,
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
  /** Already masked server-side. */
  phone: string;
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
  app: string;
  appDetail: string;
  emailList: string;
  emailListDetail: string;
};

const APP_BADGE: Record<string, { label: string; tone: Tone; title: string }> = {
  sent: { label: "app", tone: "success", title: "Sent to the app — an HSM has it." },
  failed: { label: "app failed", tone: "error", title: "The app refused it. Not retried automatically." },
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

// ── Entries table (owner) ────────────────────────────────────────────────────

export function EntriesTable({ slug, rows, sandbox }: { slug: string; rows: EntryRow[]; sandbox: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [busy, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => `${r.name} ${r.email} ${r.market}`.toLowerCase().includes(q)) : rows;

  function send(row: EntryRow) {
    const retry = row.app === "failed";
    const question = retry
      ? `Send ${row.name} to the app again?\n\nThe first attempt failed. If it actually reached the app, this makes a second deal — check the app first.`
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

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email or market"
        aria-label="Search entries"
        className="max-w-[320px]"
      />
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
          {shown.map((r) => {
            const app = APP_BADGE[r.app];
            const list = LIST_BADGE[r.emailList];
            return (
              <Tr key={r.email}>
                <Td muted className="whitespace-nowrap">
                  {r.entered}
                </Td>
                <Td className="font-semibold">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {r.name}
                    {r.isTest && <StatusBadge status="test" tone="neutral" title="One of our own tests. Never drawn." />}
                    {r.afterClose && !r.isTest && (
                      <StatusBadge status="after close" tone="neutral" title="Submitted after the entry period ended. Not in the drawing." />
                    )}
                    {r.revisions > 0 && (
                      <span className="ops-subtle" title={`Re-submitted ${r.revisions} time${r.revisions === 1 ? "" : "s"} — still one entry.`}>
                        ×{r.revisions + 1}
                      </span>
                    )}
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
                <Td>
                  <span className="inline-flex flex-wrap gap-1">
                    {app && <StatusBadge status={app.label} tone={app.tone} title={`${app.title} ${r.appDetail}`.trim()} />}
                    {list && (
                      <StatusBadge status={list.label} tone={list.tone} title={`${list.title} ${r.emailListDetail}`.trim()} />
                    )}
                    {!app && !list && <span className="ops-subtle">—</span>}
                  </span>
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  {r.inMarket && r.app !== "sent" && (
                    <button type="button" disabled={busy} onClick={() => send(r)} className={buttonClass("ghost", "sm")}>
                      {r.app === "failed" ? "Retry app" : "Send to app"}
                    </button>
                  )}
                  {r.bonus && (
                    <button type="button" disabled={busy} onClick={() => dropBonus(r)} className={buttonClass("ghost", "sm")}>
                      Remove bonus
                    </button>
                  )}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {q && shown.length === 0 && <p className="m-0 ops-subtle">No entries match “{query}”.</p>}
    </div>
  );
}

// ── Deal note switch (owner) ─────────────────────────────────────────────────

export function DealNoteSwitch({ slug, on, example }: { slug: string; on: boolean; example: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await setDealNoteAction(slug, !on);
      toast(res.ok ? "success" : "error", res.ok ? `Deal note ${on ? "off" : "on"}.` : res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge
          status={on ? "on" : "off"}
          tone={on ? "success" : "neutral"}
          title={on ? "The note is sent with every lead." : "Leads go to the app without the note."}
        />
        <Button onClick={toggle} disabled={busy}>
          {on ? "Turn off" : "Turn on"}
        </Button>
      </div>
      <p className="m-0 rounded-md bg-app-well px-3 py-2 font-mono text-[12.5px] leading-[1.5] text-content">{example}</p>
      <p className="m-0 font-sans text-ops-label text-content-muted">
        Leave off until Rich confirms the app&apos;s “requested work” field is the right place for it.
      </p>
    </div>
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
}: {
  slug: string;
  outstanding: number;
  configured: boolean;
  sandbox: boolean;
  unsubscribed: number;
  tag: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The server works through a few entrants per call — each is several
  // requests to a rate-limited API — so the screen asks again until none are
  // left, and stops the moment a batch makes no progress.
  async function syncAll() {
    setBusy(true);
    let done = 0;
    for (;;) {
      const res = await syncEmailListAction(slug);
      if (!res.ok) {
        toast("error", res.error);
        break;
      }
      done += res.processed;
      setProgress(`${done} done, ${res.remaining} to go`);
      if (res.remaining === 0 || res.processed === 0) {
        toast("success", `Email list: ${done} processed.`);
        break;
      }
    }
    setBusy(false);
    setProgress(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {sandbox ? (
        <p className="m-0 font-sans text-ops-body text-content-muted">
          Sandbox: entries are marked as they would be routed, and nothing is sent to ActiveCampaign.
        </p>
      ) : !configured ? (
        <p className="m-0 font-sans text-ops-body text-tone-bad">
          ActiveCampaign is not configured here. Entries are being kept; add ACTIVECAMPAIGN_ACCOUNT_URL and
          ACTIVECAMPAIGN_API_KEY in Vercel, redeploy, then sync.
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
      setReport({ ...res.report, found: res.found });
      if (apply) {
        toast("success", `${res.report.matched.length} booking${res.report.matched.length === 1 ? "" : "s"} recorded.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
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
          <ReportLine label="Page says booked, not in Calendly" emails={report.unverified} warn />
        </dl>
      )}
      {report && report.unverified.length > 0 && (
        <p className="m-0 font-sans text-ops-label text-content-muted">
          An unverified booking may still be real — booked under a different email, say. Check, then use “Remove
          bonus” on the row if it is not.
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
  prizes,
  draws,
  eligiblePeople,
  notify,
}: {
  slug: string;
  closed: boolean;
  prizes: string[];
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
        `Run the OFFICIAL drawing now?\n\n${eligiblePeople} people are eligible. ${prizes.length} winners and their alternates will be drawn and recorded. This cannot be undone.`
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

            <Table className="mt-2">
              <Thead>
                <Th>Drawn</Th>
                <Th>Prize</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th align="right">Entries</Th>
              </Thead>
              <tbody>
                {d.winners.map((w) => (
                  <Tr key={w.email}>
                    <Td numeric>{w.position}</Td>
                    <Td className="font-semibold">{w.prize}</Td>
                    <Td>{w.name}</Td>
                    <Td>{w.email}</Td>
                    <Td numeric className="whitespace-nowrap">{w.phone}</Td>
                    <Td align="right" numeric>{w.entries}</Td>
                  </Tr>
                ))}
                {d.alternates.map((a) => (
                  <Tr key={a.email}>
                    <Td numeric muted>alt {a.order}</Td>
                    <Td muted>—</Td>
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
