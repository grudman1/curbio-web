"use client";

import { useEffect, useMemo, useState } from "react";
import { FAIL, Meta, MUTED, Panel, SUBTLE, WARN, eyebrow } from "@/app/(site)/admin/(dashboard)/ui";
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
import { DASH, td, th } from "../hubUi";
import { saveLinkAction, type SaveLinkInput } from "./actions";

// The registry table, its row drawer (QR preview + downloads, the leads a
// campaign produced, notes), and the builder that makes a wrong URL hard to
// build. All state is local; saving goes through the server action, which
// re-validates everything — the form's live checks are a courtesy, not the
// boundary.

export type LeadLite = {
  date: string;
  name: string;
  market: string | null;
  entryPoint: string | null;
  channel: string | null;
  firstTouchChannel: string | null;
};

type Orphan = { campaign: string; count: number };

const STATUS_TONE: Record<TrackedLink["status"], string> = {
  draft: "var(--color-text-subtle)",
  live: "var(--color-state-success)",
  printed: "var(--color-brand)",
  retired: "var(--color-text-subtle)",
};

const field: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "7px 10px",
  background: "var(--color-surface-raised)",
  width: "100%",
};

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SUBTLE,
  display: "block",
  marginBottom: 5,
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
    return (
      <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0 }}>
        No tracked URL recorded — nothing to encode.
      </p>
    );
  }
  if (!qr) return <Meta>generating…</Meta>;

  const svgHref = `data:image/svg+xml;base64,${btoa(qr.svg)}`;
  const fileBase = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "qr";

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div
        aria-label={`QR code for ${url}`}
        role="img"
        style={{ width: 120, height: 120, flex: "none", border: "1px solid var(--color-border)", borderRadius: 8, padding: 6, background: "#fff" }}
        dangerouslySetInnerHTML={{ __html: qr.svg }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <a href={qr.png} download={`${fileBase}.png`} style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", fontWeight: 700, color: "var(--color-text)" }}>
          Download PNG (640px)
        </a>
        <a href={svgHref} download={`${fileBase}.svg`} style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", fontWeight: 700, color: "var(--color-text)" }}>
          Download SVG
        </a>
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-micro)", color: SUBTLE, margin: 0, maxWidth: 220, lineHeight: 1.5 }}>
          Encodes the tracked URL exactly as saved. Print only from a row whose
          destination is a redirect we control.
        </p>
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
      style={{
        cursor: "pointer",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-pill)",
        background: "transparent",
        color: copied ? "var(--color-state-success)" : MUTED,
        fontFamily: "var(--font-family-sans)",
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 9px",
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

// ── the builder ──────────────────────────────────────────────────────────────

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

function Builder({
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
    <div style={{ marginTop: "var(--space-4)" }}>
      <Panel
        title={initial.id ? "Edit link" : "New link"}
        right={<Meta>save writes a row — it publishes nothing</Meta>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label style={{ gridColumn: "1 / -1" }}>
            <span style={fieldLabel}>Label — the human name</span>
            <input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Trevor Laramee · business card QR" style={field} />
          </label>
          <label>
            <span style={fieldLabel}>Type</span>
            <select value={form.type} onChange={(e) => set("type", e.target.value)} style={field}>
              {LINK_TYPES.filter((t) => t.key !== "redirect").map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>Owner</span>
            <input value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Marketing" style={field} />
          </label>
          <label>
            <span style={fieldLabel}>utm_source — the channel, never free text</span>
            <select value={form.channel} onChange={(e) => set("channel", e.target.value)} style={field}>
              {CHANNEL_FUNNEL_ORDER.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>utm_medium</span>
            <input value={form.medium} onChange={(e) => set("medium", e.target.value)} list="mk-mediums" placeholder="business_card" style={field} />
            <datalist id="mk-mediums">
              {mediumSuggestions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <label>
            <span style={fieldLabel}>utm_campaign</span>
            <input value={form.campaign} onChange={(e) => set("campaign", e.target.value)} placeholder="biz-card-los-angeles" style={{ ...field, borderColor: campErr ? FAIL : "var(--color-border)" }} />
            {campErr && (
              <span style={{ display: "block", fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: FAIL, marginTop: 4, lineHeight: 1.4 }}>
                {campErr}
              </span>
            )}
          </label>
          <label>
            <span style={fieldLabel}>Market</span>
            <select value={form.market} onChange={(e) => set("market", e.target.value)} style={field}>
              <option value="all">all</option>
              {MARKETS.map((m) => (
                <option key={m.slug} value={m.slug}>{m.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={fieldLabel}>Status</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} style={field}>
              {LINK_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span style={fieldLabel}>Destination — where it actually lands</span>
            <input value={form.destination} onChange={(e) => set("destination", e.target.value)} disabled={urlLocked} style={{ ...field, opacity: urlLocked ? 0.55 : 1 }} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span style={fieldLabel}>Short link (go.curbio.com / curbio.com/…), if any</span>
            <input value={form.shortLink} onChange={(e) => set("shortLink", e.target.value)} placeholder="curbio.com/trevor" style={field} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span style={fieldLabel}>Notes</span>
            <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="where it's printed, who approved it, anything the next person needs" style={field} />
          </label>
        </div>

        {existingPrinted && (
          <label style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12, fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: "var(--color-text)", cursor: "pointer" }}>
            <input type="checkbox" checked={reprint} onChange={(e) => setReprint(e.target.checked)} style={{ accentColor: "var(--color-accent)" }} />
            <span>
              The physical asset is being <strong>reprinted</strong> — unlock the URL
              fields. The paper already in the world keeps the old URL forever.
            </span>
          </label>
        )}

        {/* live preview of the assembled URL */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: preview ? "var(--color-text)" : FAIL,
            background: "color-mix(in srgb, var(--color-border) 30%, transparent)",
            borderRadius: "var(--radius-lg)",
            padding: "10px 12px",
            margin: "14px 0 0",
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {preview ?? "— destination is not a valid URL —"}
        </p>

        {directRisk && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: WARN, fontWeight: 700, margin: "10px 0 0", lineHeight: 1.5 }}>
            Printed links are permanent — this one points at sell.curbio.com directly and
            cannot be repointed if the page moves. Point it at a curbio.com or
            go.curbio.com redirect instead.
          </p>
        )}
        {duplicate && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: WARN, fontWeight: 700, margin: "10px 0 0", lineHeight: 1.5 }}>
            A row with this channel + medium + campaign already exists: “{duplicate.label}”.
            Two rows with identical tags report as one line — reuse that row or change the
            campaign.
          </p>
        )}
        {serverError && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: FAIL, margin: "10px 0 0", lineHeight: 1.5 }}>
            {serverError}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              cursor: saving ? "wait" : "pointer",
              border: 0,
              borderRadius: "var(--radius-pill)",
              background: "var(--color-text)",
              color: "var(--color-surface-raised, #fff)",
              fontFamily: "var(--font-family-sans)",
              fontSize: 12.5,
              fontWeight: 700,
              padding: "8px 18px",
            }}
          >
            {saving ? "Saving…" : "Save row"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              cursor: "pointer",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-pill)",
              background: "transparent",
              color: MUTED,
              fontFamily: "var(--font-family-sans)",
              fontSize: 12.5,
              fontWeight: 700,
              padding: "8px 18px",
            }}
          >
            Cancel
          </button>
        </div>
      </Panel>
    </div>
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
  orphans,
}: {
  rows: TrackedLink[];
  campaignLeads: Record<string, LeadLite[]>;
  leadWindow: number;
  leadJoinAvailable: boolean;
  seedExportedAt: string;
  registryIssue: string | null;
  orphans: Orphan[];
}) {
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

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const selLeads = selected?.campaign ? campaignLeads[selected.campaign] ?? [] : [];

  return (
    <>
      {registryIssue && (
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: FAIL, margin: "0 0 12px", lineHeight: 1.6 }}>
          {registryIssue}
        </p>
      )}

      {/* ── orphans: the wild vs the registry ── */}
      {orphans.length > 0 && (
        <div
          style={{
            border: `1px solid color-mix(in srgb, ${WARN} 45%, transparent)`,
            borderLeft: `3px solid ${WARN}`,
            borderRadius: "var(--radius-lg)",
            padding: "12px 16px",
            marginBottom: "var(--space-4)",
          }}
        >
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
            {orphans.length} campaign tag{orphans.length > 1 ? "s are" : " is"} producing
            leads but {orphans.length > 1 ? "aren't" : "isn't"} documented here
          </p>
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, margin: "4px 0 0", lineHeight: 1.6 }}>
            {orphans.map((o) => `${o.campaign} (${o.count})`).join(" · ")} — computed
            against the last {leadWindow} leads at page load. Document each one below so
            its performance has somewhere to live.
          </p>
        </div>
      )}

      {/* ── filters ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: "var(--space-3)" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search label, campaign, URL…" style={{ ...field, width: 220, flex: "none" }} aria-label="Search links" />
        <select value={owner} onChange={(e) => setOwner(e.target.value)} style={{ ...field, width: "auto" }} aria-label="Filter by owner">
          <option value="all">owner: all</option>
          {owners.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ ...field, width: "auto" }} aria-label="Filter by channel">
          <option value="all">channel: all</option>
          {CHANNEL_FUNNEL_ORDER.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...field, width: "auto" }} aria-label="Filter by type">
          <option value="all">type: all</option>
          {LINK_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <select value={market} onChange={(e) => setMarket(e.target.value)} style={{ ...field, width: "auto" }} aria-label="Filter by market">
          <option value="all">market: all</option>
          {MARKETS.map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...field, width: "auto" }} aria-label="Filter by status">
          <option value="all">status: all</option>
          {LINK_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={{ ...field, width: "auto" }} aria-label="Sort">
          <option value="qualified">sort: Qualified</option>
          <option value="hits">sort: lifetime hits</option>
          <option value="label">sort: label</option>
        </select>
        <button
          type="button"
          onClick={() => setBuilder({ initial: emptyBuilder(), printed: false })}
          style={{
            marginLeft: "auto",
            cursor: "pointer",
            border: 0,
            borderRadius: "var(--radius-pill)",
            background: "var(--color-text)",
            color: "var(--color-surface-raised, #fff)",
            fontFamily: "var(--font-family-sans)",
            fontSize: 12.5,
            fontWeight: 700,
            padding: "8px 16px",
          }}
        >
          New link
        </button>
      </div>

      {builder && (
        <Builder
          initial={builder.initial}
          existingPrinted={builder.printed}
          rows={rows}
          onClose={() => setBuilder(null)}
          onSaved={() => {
            setBuilder(null);
            window.location.reload();
          }}
        />
      )}

      {/* ── the table ── */}
      <div style={{ marginTop: "var(--space-4)" }}>
        <Panel
          title={`${filtered.length} of ${rows.length} links`}
          right={
            <Meta>
              seed: redirect export {seedExportedAt} + HSM cards · Qualified = estimate
              requests carrying the campaign, last {leadWindow} leads
            </Meta>
          }
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Label</th>
                  <th style={th}>Type</th>
                  <th style={th}>Channel</th>
                  <th style={th}>Campaign</th>
                  <th style={th}>Link</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: "right" }}>Clicks 30d</th>
                  <th style={{ ...th, textAlign: "right" }}>Lifetime</th>
                  <th style={{ ...th, textAlign: "right" }}>Qualified</th>
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
                      style={{ cursor: "pointer", background: selectedId === r.id ? "color-mix(in srgb, var(--color-accent) 7%, transparent)" : undefined }}
                    >
                      <td style={{ ...td, minWidth: 180, borderLeft: direct ? `3px solid ${WARN}` : "3px solid transparent", paddingLeft: 8 }}>
                        <span style={{ fontWeight: 600 }}>{r.label}</span>
                        <span style={{ display: "block", fontSize: "var(--text-label)", color: SUBTLE, marginTop: 1 }}>
                          {r.owner}
                          {r.market !== "all" ? ` · ${r.market}` : ""}
                        </span>
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap", color: MUTED }}>{typeLabel(r.type)}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <span style={{ color: r.channel === "direct" ? SUBTLE : "var(--color-text)" }}>
                          {CHANNEL_LABELS[r.channel]}
                        </span>
                        {r.medium && (
                          <span style={{ display: "block", fontSize: "var(--text-label)", color: SUBTLE }}>{r.medium}</span>
                        )}
                      </td>
                      <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12, color: r.campaign ? "var(--color-text)" : SUBTLE }}>
                        {r.campaign || DASH}
                      </td>
                      <td style={{ ...td, maxWidth: 200 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: 12 }} title={r.trackedUrl || r.destination}>
                          {r.shortLink || r.destination || DASH}
                        </span>
                        {wp && (
                          <span style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: WARN }} title="Destination is a WordPress page — it may not survive the website migration.">
                            WP page — migration risk
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: "var(--text-label)", fontWeight: 700, color: STATUS_TONE[r.status] }}>{r.status}</span>
                        {(r.printedAt || r.createdAt) && (
                          <span style={{ display: "block", fontSize: "var(--text-micro)", color: SUBTLE }}>
                            {r.status === "printed" && r.printedAt ? `printed ${r.printedAt}` : r.createdAt ? r.createdAt.slice(0, 10) : ""}
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: SUBTLE }} title="30-day clicks need a click source for the redirects — none exists yet.">
                        {DASH}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.lifetimeHits ? "var(--color-text)" : SUBTLE }} title={`Lifetime hits as of the ${seedExportedAt} export`}>
                        {r.lifetimeHits != null ? r.lifetimeHits.toLocaleString("en-US") : DASH}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: qual ? 700 : 400, color: qual ? "var(--color-text)" : SUBTLE }}>
                        {leadJoinAvailable ? qual : DASH}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td style={{ ...td, color: SUBTLE, borderBottom: 0 }} colSpan={9}>
                      No links match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0", lineHeight: 1.6 }}>
            A link with clicks and zero Qualified is worth seeing; so is a link with zero
            of both. Amber edge = printed asset pointing straight at sell.curbio.com.
            Seed redirects live in the WordPress Redirection plugin and must be recreated
            at website cutover.
          </p>
        </Panel>
      </div>

      {/* ── row drawer ── */}
      {selected && (
        <>
          <div aria-hidden onClick={() => setSelectedId(null)} style={{ position: "fixed", inset: 0, background: "rgba(16, 42, 67, 0.18)", zIndex: 60 }} />
          <aside
            role="dialog"
            aria-label={`${selected.label} details`}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(440px, 94vw)",
              background: "var(--color-surface-raised)",
              borderLeft: "1px solid var(--color-border)",
              boxShadow: "var(--elevation-raised)",
              zIndex: 61,
              overflowY: "auto",
              padding: "20px 22px 40px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h3 style={{ fontFamily: "var(--font-family-serif)", fontSize: 19, fontWeight: 600, margin: 0, flex: 1 }}>
                {selected.label}
              </h3>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Close details" style={{ cursor: "pointer", border: 0, background: "transparent", color: MUTED, fontSize: 18, lineHeight: 1, padding: 4 }}>
                ×
              </button>
            </div>
            <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "3px 0 0" }}>
              {typeLabel(selected.type)} · {selected.owner} · {selected.market} ·{" "}
              <span style={{ fontWeight: 700, color: STATUS_TONE[selected.status] }}>{selected.status}</span>
            </p>

            {printedDirectRisk(selected) && (
              <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: WARN, fontWeight: 700, margin: "12px 0 0", lineHeight: 1.5 }}>
                Printed links are permanent — this one points at sell.curbio.com directly
                and cannot be repointed if the page moves.
              </p>
            )}

            <div style={{ marginTop: 18 }}>
              <p style={{ ...eyebrow, marginBottom: 8 }}>QR</p>
              <QrBlock url={selected.trackedUrl} label={selected.label} />
            </div>

            <div style={{ marginTop: 20 }}>
              <p style={{ ...eyebrow, marginBottom: 8 }}>URLs</p>
              {selected.trackedUrl ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all", lineHeight: 1.5 }}>{selected.trackedUrl}</span>
                  <CopyButton text={selected.trackedUrl} />
                </div>
              ) : (
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0 }}>
                  Tracked URL unknown — recover it from the physical asset.
                </p>
              )}
              {selected.shortLink && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: MUTED, margin: "6px 0 0" }}>
                  short: {selected.shortLink}
                </p>
              )}
              {selected.destination && selected.destination !== selected.trackedUrl && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: MUTED, margin: "6px 0 0", wordBreak: "break-all" }}>
                  lands: {selected.destination}
                </p>
              )}
              {selected.rawUtmSource && (
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "6px 0 0" }}>
                  carries utm_source={selected.rawUtmSource} — outside the nine channels,
                  so its leads land as direct.
                </p>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <p style={{ ...eyebrow, marginBottom: 8 }}>Clicks</p>
              <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: MUTED, margin: 0, lineHeight: 1.6 }}>
                30-day clicks: {DASH} — no click source exists for these redirects yet.
                {selected.lifetimeHits != null &&
                  ` Lifetime: ${selected.lifetimeHits.toLocaleString("en-US")} hits as of the ${seedExportedAt} export.`}
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <p style={{ ...eyebrow, marginBottom: 8 }}>
                Qualified — last {leadWindow} leads
              </p>
              {!leadJoinAvailable ? (
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0 }}>
                  Lead store unavailable — the campaign join is off.
                </p>
              ) : !selected.campaign ? (
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0, lineHeight: 1.6 }}>
                  No campaign tag on this link — its leads cannot be joined back to it.
                  That is exactly what the registry exists to fix.
                </p>
              ) : selLeads.length === 0 ? (
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0 }}>
                  No estimate requests carrying “{selected.campaign}” in the window.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Date</th>
                      <th style={th}>Lead</th>
                      <th style={th}>Entry</th>
                      <th style={th}>Touch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selLeads.map((l, i) => (
                      <tr key={i}>
                        <td style={{ ...td, whiteSpace: "nowrap", fontSize: 12 }}>{l.date}</td>
                        <td style={{ ...td, fontSize: 12 }}>{l.name}</td>
                        <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{l.entryPoint ?? DASH}</td>
                        <td style={{ ...td, fontSize: 12 }}>
                          {l.channel ?? DASH}
                          {l.firstTouchChannel && l.firstTouchChannel !== l.channel
                            ? ` (first: ${l.firstTouchChannel})`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {selected.notes && (
              <div style={{ marginTop: 20 }}>
                <p style={{ ...eyebrow, marginBottom: 8 }}>Notes</p>
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: "var(--color-text)", margin: 0, lineHeight: 1.6 }}>
                  {selected.notes}
                </p>
              </div>
            )}

            <div style={{ marginTop: 24, borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
              {selected.origin === "registry" ? (
                <button
                  type="button"
                  onClick={() => {
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
                  style={{
                    cursor: "pointer",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-pill)",
                    background: "transparent",
                    color: "var(--color-text)",
                    fontFamily: "var(--font-family-sans)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: "7px 16px",
                  }}
                >
                  Edit row
                </button>
              ) : (
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0, lineHeight: 1.6 }}>
                  Seed row — imported inventory. Corrections happen in git
                  (config/linkRegistry.ts or the import script), where they are reviewable.
                </p>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
