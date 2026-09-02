"use client";

import { deriveChannel } from "@/lib/channels";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/(site)/admin/_ui/Button";
import { Table, Thead, Th, Tr, Td } from "@/app/(site)/admin/_ui/v2/DataTable";
import { Drawer } from "@/app/(site)/admin/_ui/Drawer";
import { Field, FieldError, Input, Select } from "@/app/(site)/admin/_ui/Field";
import { OpsCard } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { StatusBadge } from "@/app/(site)/admin/_ui/v2/HealthDot";

/** Em-dash for a value that does not exist. */
const DASH = "\u2014";
import { useToast } from "@/app/(site)/admin/_ui/Toast";
import { CHANNEL_FUNNEL_ORDER, CHANNEL_LABELS } from "@/config/marketingHub";
import { MARKETS } from "@/config/markets";
import {
  assembleTrackedUrl,
  campaignError,
  LINK_STATUSES,
  LINK_TYPES,
  migrationRisk,
  printedDirectRisk,
  type TrackedLink,
} from "@/lib/marketingLinks";
import { saveLinkAction, type SaveLinkInput } from "./actions";

// The registry table, its row drawer (QR preview + downloads, the leads a
// campaign produced, notes), and the builder drawer that makes a wrong URL
// hard to build. All state is local; saving goes through the server action,
// which re-validates everything — the form's live checks are a courtesy, not
// the boundary.

export type LeadLite = {
  date: string;
  name: string;
  market: string | null;
  entryPoint: string | null;
  channel: string | null;
  firstTouchChannel: string | null;
};

/** Link status -> ops badge tone. live is the only good state; retired is
 *  neutral rather than red — a retired link is finished, not broken. */
const OPS_STATUS_TONE: Record<string, "success" | "warning" | "error" | "neutral"> = {
  live: "success",
  printed: "warning",
  draft: "neutral",
  retired: "neutral",
};

const STATUS_TONE: Record<TrackedLink["status"], "good" | "info" | "neutral"> = {
  draft: "neutral",
  live: "good",
  printed: "info",
  retired: "neutral",
};

function typeLabel(key: string): string {
  return LINK_TYPES.find((t) => t.key === key)?.label ?? key;
}

// ── QR block (drawer) ────────────────────────────────────────────────────────

function QrBlock({ url, label }: { url: string; label: string }) {
  const [qr, setQr] = useState<{ svg: string; png: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setQr(null);
    if (!url) return;
    import("qrcode").then(async (QR) => {
      const svg = await QR.toString(url, { type: "svg", margin: 1, width: 160 });
      const png = await QR.toDataURL(url, { margin: 1, width: 640 });
      if (alive) setQr({ svg, png });
    });
    return () => {
      alive = false;
    };
  }, [url]);

  if (!url) {
    return <p className="m-0 ops-subtle">No tracked URL recorded.</p>;
  }
  if (!qr) return <span className="ops-card-meta">generating…</span>;

  const svgHref = `data:image/svg+xml;base64,${btoa(qr.svg)}`;
  const fileBase = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "qr";

  return (
    <div className="flex flex-wrap items-start gap-4">
      {/* The injected markup arrives as a string; force the <svg> to fill its
          clipped box. */}
      <style>{`.qr-box > svg { width: 100%; height: 100%; display: block; }`}</style>
      <div
        className="qr-box box-border h-[120px] w-[120px] flex-none overflow-hidden rounded-md border border-app-border bg-white p-1.5"
        aria-label={`QR code for ${url}`}
        title="Encodes the tracked URL exactly as saved."
        role="img"
        dangerouslySetInnerHTML={{ __html: qr.svg }}
      />
      <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
        <a href={qr.png} download={`${fileBase}.png`} className="font-sans text-ops-label font-bold text-content hover:underline">
          Download PNG (640px)
        </a>
        <a href={svgHref} download={`${fileBase}.svg`} className="font-sans text-ops-label font-bold text-content hover:underline">
          Download SVG
        </a>
      </div>
    </div>
  );
}

// ── copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      title={text}
      className={`cursor-pointer rounded-pill border border-app-border-strong bg-transparent px-2.5 py-0.5 font-sans text-[11px] font-bold transition-colors duration-fast ease-out ${
        copied ? "text-tone-good" : "text-content-muted hover:text-content"
      }`}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

// ── the builder (drawer) ─────────────────────────────────────────────────────

type BuilderState = SaveLinkInput;

function emptyBuilder(): BuilderState {
  return {
    label: "",
    type: "qr",
    owner: "",
    channel: "hsm_field",
    medium: "",
    campaign: "",
    market: "all",
    destination: "https://sell.curbio.com/",
    shortLink: "",
    status: "draft",
    notes: "",
  };
}

function BuilderDrawer({
  initial,
  existingPrinted,
  rows,
  onClose,
  onSaved,
}: {
  initial: BuilderState;
  /** True when editing a row whose STORED status is printed — the lock. */
  existingPrinted: boolean;
  rows: TrackedLink[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BuilderState>(initial);
  const [reprint, setReprint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof BuilderState>(k: K, v: BuilderState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const campErr = form.campaign ? campaignError(form.campaign) : null;
  const preview = assembleTrackedUrl(form.destination, form.channel, form.medium, form.campaign);
  const duplicate = rows.find(
    (r) =>
      r.id !== initial.id &&
      r.campaign &&
      r.campaign === form.campaign.trim() &&
      r.channel === form.channel &&
      r.medium === form.medium.trim()
  );
  const mediumSuggestions = [...new Set(rows.map((r) => r.medium).filter(Boolean))].sort();
  const urlLocked = existingPrinted && !reprint;
  const directRisk = printedDirectRisk({
    type: form.type as TrackedLink["type"],
    status: form.status as TrackedLink["status"],
    destination: form.destination,
  });

  async function save() {
    setSaving(true);
    setServerError(null);
    const result = await saveLinkAction({ ...form, reprintConfirmed: reprint });
    setSaving(false);
    if (result.ok) onSaved();
    else setServerError(result.error);
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial.id ? "Edit link" : "New link"}
      width={520}
      footer={
        <>
          <span title="Saves a row — publishes nothing.">
            <Button variant="primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save row"}
            </Button>
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
        <Field label="Label — the human name" className="col-span-2">
          <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Trevor Laramee · business card QR" />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
            {LINK_TYPES.filter((t) => t.key !== "redirect").map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Owner">
          <Input value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Marketing" />
        </Field>
        <Field label="utm_source — the channel, never free text">
          <Select value={form.channel} onChange={(e) => set("channel", e.target.value)}>
            {CHANNEL_FUNNEL_ORDER.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="utm_medium">
          <Input value={form.medium} onChange={(e) => set("medium", e.target.value)} list="mk-mediums" placeholder="business_card" />
          <datalist id="mk-mediums">
            {mediumSuggestions.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <Field label="utm_campaign">
          <Input
            value={form.campaign}
            onChange={(e) => set("campaign", e.target.value)}
            placeholder="biz-card-los-angeles"
            className={campErr ? "border-tone-bad" : ""}
          />
          {campErr && <FieldError>{campErr}</FieldError>}
        </Field>
        <Field label="Market">
          <Select value={form.market} onChange={(e) => set("market", e.target.value)}>
            <option value="all">all</option>
            {MARKETS.map((m) => (
              <option key={m.slug} value={m.slug}>{m.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            {LINK_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Destination — where it actually lands" className="col-span-2">
          <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} disabled={urlLocked} />
        </Field>
        <Field label="Short link (go.curbio.com / curbio.com/…), if any" className="col-span-2">
          <Input value={form.shortLink} onChange={(e) => set("shortLink", e.target.value)} placeholder="curbio.com/trevor" />
        </Field>
        <Field label="Notes" className="col-span-2">
          <Input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="where it's printed, who approved it, anything the next person needs"
          />
        </Field>
      </div>

      {existingPrinted && (
        <label className="mt-3 flex cursor-pointer items-baseline gap-2 font-sans text-ops-body text-content">
          <input
            type="checkbox"
            checked={reprint}
            onChange={(e) => setReprint(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          <span title="The paper already in the world keeps the old URL forever.">
            The physical asset is being <strong>reprinted</strong> — unlock the URL fields.
          </span>
        </label>
      )}

      {/* live preview of the assembled URL */}
      <p
        className={`m-0 mt-3.5 break-all rounded-md bg-app-well px-3 py-2.5 font-mono text-[12.5px] leading-[1.5] ${
          preview ? "text-content" : "text-tone-bad"
        }`}
      >
        {preview ?? "— destination is not a valid URL —"}
      </p>

      {(directRisk || duplicate) && (
        <p className="m-0 mt-2.5 flex flex-wrap gap-1.5">
          {directRisk && (
            <StatusBadge
              status="printed → direct"
              tone="warning"
              title="Points at sell.curbio.com directly and cannot be repointed if the page moves — use a curbio.com or go.curbio.com redirect."
            />
          )}
          {duplicate && (
            <StatusBadge
              status="duplicate tags"
              tone="warning"
              title={`Same channel + medium + campaign as “${duplicate.label}” — two rows with identical tags report as one line.`}
            />
          )}
        </p>
      )}
      <FieldError>{serverError}</FieldError>
    </Drawer>
  );
}

// ── the table + drawer ───────────────────────────────────────────────────────

export function LinksTable({
  rows,
  campaignLeads,
  leadWindow,
  leadJoinAvailable,
  seedExportedAt,
  registryIssue,
}: {
  rows: TrackedLink[];
  campaignLeads: Record<string, LeadLite[]>;
  leadWindow: number;
  leadJoinAvailable: boolean;
  seedExportedAt: string;
  registryIssue: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("all");
  const [channel, setChannel] = useState("all");
  const [type, setType] = useState("all");
  const [market, setMarket] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"qualified" | "hits" | "label">("qualified");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [builder, setBuilder] = useState<{ initial: BuilderState; printed: boolean } | null>(null);

  const qualifiedOf = (r: TrackedLink) => (r.campaign ? campaignLeads[r.campaign]?.length ?? 0 : 0);

  const owners = useMemo(() => [...new Set(rows.map((r) => r.owner))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (owner !== "all" && r.owner !== owner) return false;
      if (channel !== "all" && r.channel !== channel) return false;
      if (type !== "all" && r.type !== type) return false;
      if (market !== "all" && r.market !== market) return false;
      if (status !== "all" && r.status !== status) return false;
      if (needle) {
        const hay = `${r.label} ${r.campaign} ${r.medium} ${r.shortLink} ${r.destination}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      if (sort === "qualified") {
        return (
          qualifiedOf(b) - qualifiedOf(a) ||
          (b.lifetimeHits ?? 0) - (a.lifetimeHits ?? 0) ||
          a.label.localeCompare(b.label)
        );
      }
      if (sort === "hits") return (b.lifetimeHits ?? 0) - (a.lifetimeHits ?? 0) || a.label.localeCompare(b.label);
      return a.label.localeCompare(b.label);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, owner, channel, type, market, status, sort, campaignLeads]);

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;
  const selLeads = selected?.campaign ? campaignLeads[selected.campaign] ?? [] : [];

  const filterControl = "h-[30px] !w-auto";

  return (
    <>
      {registryIssue && (
        <p className="m-0 mb-3 font-sans text-ops-body leading-[1.6] text-tone-bad" role="alert">
          {registryIssue}
        </p>
      )}

      {/* ── filters ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search label, campaign, URL…"
          aria-label="Search links"
          className="h-[30px] !w-[220px] flex-none"
        />
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filter by owner" className={filterControl}>
          <option value="all">owner: all</option>
          {owners.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
        <Select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Filter by channel" className={filterControl}>
          <option value="all">channel: all</option>
          {CHANNEL_FUNNEL_ORDER.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type" className={filterControl}>
          <option value="all">type: all</option>
          {LINK_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </Select>
        <Select value={market} onChange={(e) => setMarket(e.target.value)} aria-label="Filter by market" className={filterControl}>
          <option value="all">market: all</option>
          {MARKETS.map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={filterControl}>
          <option value="all">status: all</option>
          {LINK_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className={filterControl}>
          <option value="qualified">sort: Qualified</option>
          <option value="hits">sort: lifetime hits</option>
          <option value="label">sort: label</option>
        </Select>
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => setBuilder({ initial: emptyBuilder(), printed: false })}>
          New link
        </Button>
      </div>

      {/* ── the table ── */}
      <OpsCard
        title={`${filtered.length} of ${rows.length} links`}
        titleTooltip={`Seed rows: redirect export of ${seedExportedAt} plus the HSM business cards; seed redirects live in the WordPress Redirection plugin and must be recreated at website cutover. Rows created here live in Redis.`}
      >
        <Table>
          <thead>
            <tr>
              <Th>Label</Th>
              <Th>Type</Th>
              <Th>Channel</Th>
              <Th>Campaign</Th>
              <Th>Link</Th>
              <Th>Status</Th>
              <Th align="right">Clicks 30d</Th>
              <Th align="right">Lifetime</Th>
              <Th align="right">
                <span title={`Qualified = estimate requests carrying the campaign, last ${leadWindow} leads.`}>
                  Qualified
                </span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const direct = printedDirectRisk(r);
              const wp = migrationRisk(r);
              const qual = qualifiedOf(r);
              return (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="group/row cursor-pointer transition-colors duration-fast ease-out hover:bg-app-well"
                >
                  <Td className="min-w-[180px]">
                    <span className="font-semibold">{r.label}</span>
                    <span className="mt-px block ops-subtle">
                      {r.owner}
                      {r.market !== "all" ? ` · ${r.market}` : ""}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-content-muted">{typeLabel(r.type)}</Td>
                  <Td className="whitespace-nowrap">
                    <span className={r.channel === "direct" ? "text-content-subtle" : "text-content"}>
                      {CHANNEL_LABELS[r.channel]}
                    </span>
                    {r.medium && <span className="block ops-subtle">{r.medium}</span>}
                  </Td>
                  <Td muted={!r.campaign} className="font-mono text-[12px]">
                    {r.campaign || DASH}
                  </Td>
                  <Td className="max-w-[200px]">
                    <span
                      className="block truncate font-mono text-[12px]"
                      title={r.trackedUrl || r.destination}
                    >
                      {r.shortLink || r.destination || DASH}
                    </span>
                    <span className="flex flex-wrap gap-1 pt-0.5 empty:hidden">
                      {direct && (
                        <span title="Printed asset pointing straight at sell.curbio.com — it cannot be repointed."><StatusBadge status={"printed → direct"} tone={"warning"} /></span>
                      )}
                      {wp && (
                        <span title="Destination is a WordPress page — it may not survive the website migration."><StatusBadge status={"WP migration risk"} tone={"warning"} /></span>
                      )}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge status={<>{r.status}</>} tone={OPS_STATUS_TONE[r.status]} />
                    {(r.printedAt || r.createdAt) && (
                      <span className="mt-0.5 block ops-subtle text-[11px]">
                        {r.status === "printed" && r.printedAt ? `printed ${r.printedAt}` : r.createdAt ? r.createdAt.slice(0, 10) : ""}
                      </span>
                    )}
                  </Td>
                  <Td align="right" muted title="30-day clicks need a click source for the redirects — none exists yet.">
                    {DASH}
                  </Td>
                  <Td align="right" muted={!r.lifetimeHits} title={`Lifetime hits as of the ${seedExportedAt} export`}>
                    {r.lifetimeHits != null ? r.lifetimeHits.toLocaleString("en-US") : DASH}
                  </Td>
                  <Td align="right" muted={!qual} className={qual ? "font-bold" : ""}>
                    {leadJoinAvailable ? qual : DASH}
                  </Td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <Td muted colSpan={9} className="border-b-0">
                  No links match these filters.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </OpsCard>

      {/* ── row detail drawer ── */}
      <Drawer
        open={!!selected && !builder}
        onClose={() => setSelectedId(null)}
        title={selected?.label ?? ""}
        width={460}
        footer={
          selected?.origin === "registry" ? (
            <Button
              variant="secondary"
              onClick={() => {
                if (!selected) return;
                setBuilder({
                  initial: {
                    id: selected.id,
                    label: selected.label,
                    type: selected.type,
                    owner: selected.owner,
                    channel: selected.channel,
                    medium: selected.medium,
                    campaign: selected.campaign,
                    market: selected.market,
                    destination: selected.destination,
                    shortLink: selected.shortLink,
                    status: selected.status,
                    notes: selected.notes ?? "",
                  },
                  printed: selected.status === "printed",
                });
                setSelectedId(null);
              }}
            >
              Edit row
            </Button>
          ) : (
            <span
              className="ops-card-meta"
              title="Corrections happen in git (config/linkRegistry.ts), where they are reviewable."
            >
              Seed row
            </span>
          )
        }
      >
        {selected && (
          <>
            <p className="m-0 flex flex-wrap items-center gap-1.5 ops-subtle">
              {typeLabel(selected.type)} · {selected.owner} · {selected.market}
              <StatusBadge status={selected.status} tone={OPS_STATUS_TONE[selected.status]} />
              {printedDirectRisk(selected) && (
                <StatusBadge
                  status="printed → direct"
                  tone="warning"
                  title="Printed asset pointing straight at sell.curbio.com — it cannot be repointed if the page moves."
                />
              )}
            </p>

            <div className="mt-4">
              <span className="ops-eyebrow mb-2 block">QR</span>
              <QrBlock url={selected.trackedUrl} label={selected.label} />
            </div>

            <div className="mt-5">
              <span className="ops-eyebrow mb-2 block">URLs</span>
              {selected.trackedUrl ? (
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 break-words font-mono text-[12px] leading-[1.5] [overflow-wrap:anywhere]">
                    {selected.trackedUrl}
                  </span>
                  <CopyButton text={selected.trackedUrl} />
                </div>
              ) : (
                <p className="m-0 ops-subtle" title="Recoverable from the physical asset.">
                  Tracked URL unknown
                </p>
              )}
              {selected.shortLink && (
                <p className="m-0 mt-1.5 font-mono text-[12px] text-content-muted">short: {selected.shortLink}</p>
              )}
              {selected.destination && selected.destination !== selected.trackedUrl && (
                <p className="m-0 mt-1.5 font-mono text-[12px] text-content-muted [overflow-wrap:anywhere]">
                  lands: {selected.destination}
                </p>
              )}
              {/* CHECK, don't assume — deriveChannel() is the authority on
                  whether a raw utm_source lands inside the ten. */}
              {selected.rawUtmSource &&
                (deriveChannel(selected.rawUtmSource) === "direct" &&
                selected.rawUtmSource.trim().toLowerCase() !== "direct" ? (
                  <p
                    className="m-0 mt-1.5 ops-subtle"
                    title="Outside the ten channels — its leads land as direct."
                  >
                    utm_source={selected.rawUtmSource} → direct
                  </p>
                ) : (
                  <p className="m-0 mt-1.5 ops-subtle">
                    utm_source={selected.rawUtmSource} → {deriveChannel(selected.rawUtmSource)}
                  </p>
                ))}
            </div>

            <div className="mt-5">
              <span className="ops-eyebrow mb-2 block">Clicks</span>
              <p className="m-0 font-sans text-ops-body leading-[1.6] text-content-muted">
                <span title="30-day clicks need a click source for the redirects — none exists yet.">
                  30d: {DASH}
                </span>
                {selected.lifetimeHits != null && (
                  <span title={`As of the ${seedExportedAt} export.`}>
                    {" "}· lifetime: {selected.lifetimeHits.toLocaleString("en-US")}
                  </span>
                )}
              </p>
            </div>

            <div className="mt-5">
              <span className="ops-eyebrow mb-2 block">Qualified — last {leadWindow} leads</span>
              {!leadJoinAvailable ? (
                <p className="m-0 ops-subtle">Lead store unavailable</p>
              ) : !selected.campaign ? (
                <p
                  className="m-0 ops-subtle"
                  title="Without a campaign tag, leads cannot be joined back to this link."
                >
                  No campaign tag
                </p>
              ) : selLeads.length === 0 ? (
                <p className="m-0 ops-subtle">
                  No estimate requests carrying &ldquo;{selected.campaign}&rdquo; in the window.
                </p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Lead</Th>
                      <Th>Entry</Th>
                      <Th>Touch</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {selLeads.map((l, i) => (
                      <Tr key={i}>
                        <Td className="whitespace-nowrap text-[12px]">{l.date}</Td>
                        <Td className="text-[12px]">{l.name}</Td>
                        <Td muted={!l.entryPoint} className="font-mono text-[11.5px]">
                          {l.entryPoint ?? DASH}
                        </Td>
                        <Td className="text-[12px]">
                          {l.channel ?? DASH}
                          {l.firstTouchChannel && l.firstTouchChannel !== l.channel
                            ? ` (first: ${l.firstTouchChannel})`
                            : ""}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>

            {selected.notes && (
              <div className="mt-5">
                <span className="ops-eyebrow mb-2 block">Notes</span>
                <p className="m-0 font-sans text-ops-body leading-[1.6] text-content">{selected.notes}</p>
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* ── builder drawer ── */}
      {builder && (
        <BuilderDrawer
          initial={builder.initial}
          existingPrinted={builder.printed}
          rows={rows}
          onClose={() => setBuilder(null)}
          onSaved={() => {
            setBuilder(null);
            toast("success", "Link saved.");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
