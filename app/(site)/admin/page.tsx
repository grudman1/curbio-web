import type { Metadata } from "next";
import {
  readRecentLeads,
  maskEmail,
  maskName,
  maskPhone,
  deliveryState,
  type LeadRow,
} from "@/lib/adminLeads";
import { buildPageRegistry, registrySummary } from "@/config/pageRegistry";

// ─────────────────────────────────────────────────────────────────────────────
// /admin — internal surface. Gated in middleware by ADMIN_SECRET (HTTP Basic);
// this file assumes it is already authorised and never checks again.
//
// A plain server component that reads Redis directly. No API route, because
// the middleware matcher excludes /api and an admin API route would have to
// re-implement the auth check itself — one gate is safer than two.
//
// READ-ONLY by credential: lib/adminLeads.ts holds the read-only Upstash
// token, so no bug here can mutate the lead store.
// ─────────────────────────────────────────────────────────────────────────────

// Never cached: a stale lead table during a delivery incident is worse than no
// table, because it looks current.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Admin — Curbio",
  robots: { index: false, follow: false },
};

const TONE: Record<string, string> = {
  ok: "var(--color-state-success)",
  warn: "var(--color-state-warning)",
  fail: "var(--color-state-error)",
  unknown: "var(--color-text-subtle)",
};

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "var(--space-16)" }}>
      <h2
        style={{
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-label)",
          fontWeight: 800,
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          paddingBottom: "var(--space-3)",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "var(--space-4)",
        }}
      >
        {title}
      </h2>
      {note && (
        <p
          style={{
            fontSize: "var(--text-small)",
            color: "var(--color-text-muted)",
            margin: "0 0 var(--space-6)",
            maxWidth: "76ch",
            lineHeight: "var(--leading-body)",
          }}
        >
          {note}
        </p>
      )}
      {children}
    </section>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: "var(--text-micro)",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-text-subtle)",
  padding: "var(--space-2) var(--space-3)",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--color-border)",
};
const td: React.CSSProperties = {
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  padding: "var(--space-3)",
  borderBottom: "1px solid var(--color-border)",
  verticalAlign: "top",
};

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "var(--text-micro)",
        fontWeight: 700,
        color: TONE[tone],
        border: `1px solid ${TONE[tone]}`,
        borderRadius: "var(--radius-pill)",
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function LeadTable({ rows }: { rows: LeadRow[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 }}>
        <thead>
          <tr>
            {[
              "Submitted",
              "Lead",
              "Market",
              "Delivery",
              "Source",
              "Channel",
              "Campaign",
              "First touch",
              "Referral source",
            ].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ lead, delivery }, i) => {
            const state = deliveryState(delivery);
            return (
              <tr key={lead.leadId ?? i}>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {lead.submittedAt ? lead.submittedAt.replace("T", " ").replace(/\..*$/, "") : "—"}
                </td>
                <td style={td}>
                  {maskName(lead)}
                  <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "var(--text-micro)" }}>
                    {maskEmail(lead.email)} · {maskPhone(lead.phone)}
                  </span>
                </td>
                <td style={td}>{lead.market ?? "—"}</td>
                <td style={td}>
                  <Pill label={state.label} tone={state.tone} />
                  {delivery?.crmError && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: "var(--text-micro)",
                        color: "var(--color-state-error)",
                        maxWidth: "32ch",
                      }}
                    >
                      {delivery.crmError}
                    </span>
                  )}
                </td>
                <td style={td}>{lead.source ?? "—"}</td>
                <td style={td}>{lead.channel ?? "—"}</td>
                <td style={td}>{lead.utm_campaign ?? "—"}</td>
                <td style={td}>
                  {lead.firstTouchChannel ?? "—"}
                  {lead.firstTouchCampaign && (
                    <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "var(--text-micro)" }}>
                      {lead.firstTouchCampaign}
                    </span>
                  )}
                </td>
                <td style={td}>
                  {lead.referralSourceId ?? "—"}
                  <span style={{ display: "block", marginTop: 4 }}>
                    {lead.referralSourceVerified === undefined ? (
                      <Pill label="untagged" tone="unknown" />
                    ) : lead.referralSourceVerified ? (
                      <Pill label="verified" tone="ok" />
                    ) : (
                      <Pill label="unverified" tone="warn" />
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage() {
  const leads = await readRecentLeads(50);
  const registry = buildPageRegistry();
  const summary = registrySummary(registry);

  return (
    <main
      style={{
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-12) var(--container-gutter) var(--space-24)",
        background: "var(--color-surface)",
      }}
    >
      <header style={{ marginBottom: "var(--space-12)" }}>
        <h1
          style={{
            fontFamily: "var(--font-family-serif)",
            fontSize: "var(--text-h2)",
            fontWeight: 600,
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          Admin
        </h1>
        <p style={{ fontSize: "var(--text-body)", color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
          Read-only. This page holds the <strong>read-only</strong> Upstash
          token, so nothing here can modify the lead store even by mistake.
        </p>
      </header>

      <Section
        title="Recent leads"
        note={
          <>
            Newest 50 of {leads.configured && !leads.error ? leads.total : "—"}, joined with their
            delivery outcome. Identities are <strong>masked deliberately</strong>: this view exists
            to diagnose delivery and audit attribution, not to look up contacts — the CRM does that,
            and the CRM-failure alert email already carries the full payload for manual recovery.
            Masking keeps the page safe to screenshot or leave open.
          </>
        }
      >
        {!leads.configured ? (
          <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
            Upstash is not configured in this environment, so there is no lead store to read.
          </p>
        ) : leads.error ? (
          <p style={{ fontSize: "var(--text-small)", color: "var(--color-state-error)" }}>
            Could not read the lead store: {leads.error}. This is an admin-page failure, not
            necessarily a lead-pipeline failure — check <code>/api/lead</code> logs before assuming
            leads are being lost.
          </p>
        ) : leads.rows.length === 0 ? (
          <p style={{ fontSize: "var(--text-small)", color: "var(--color-text-muted)" }}>
            No leads stored yet.
          </p>
        ) : (
          <LeadTable rows={leads.rows} />
        )}
      </Section>

      <Section
        title="Page registry"
        note={
          <>
            {summary.live} live · {summary.draft} draft · {summary.planned} planned ·{" "}
            {summary.indexed} indexable · {summary.unassigned} unowned. Derived from{" "}
            <code>config/routes.ts</code>, <code>config/campaigns/</code>,{" "}
            <code>config/markets.ts</code> and <code>config/navigation.ts</code> — nothing here is
            hand-maintained, so it cannot drift from the app. The <strong>planned</strong> rows are
            pages the navigation links to that do not exist yet: that gap is the Phase 3 backlog,
            and it updates itself when either side changes.
          </>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
            <thead>
              <tr>
                {["Path", "Group", "Title", "Status", "Indexed", "Owner", "Derived from"].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registry.map((e) => (
                <tr key={e.path}>
                  <td style={{ ...td, fontFamily: "monospace", whiteSpace: "nowrap" }}>{e.path}</td>
                  <td style={td}>{e.group}</td>
                  <td style={td}>{e.title}</td>
                  <td style={td}>
                    <Pill
                      label={e.status}
                      tone={e.status === "live" ? "ok" : e.status === "draft" ? "warn" : "unknown"}
                    />
                  </td>
                  <td style={td}>{e.indexed ? "yes" : "no"}</td>
                  <td style={{ ...td, color: e.owner === "unassigned" ? "var(--color-text-subtle)" : undefined }}>
                    {e.owner}
                  </td>
                  <td style={{ ...td, fontSize: "var(--text-micro)", color: "var(--color-text-muted)" }}>
                    {e.derivedFrom}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p
          style={{
            fontSize: "var(--text-micro)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-4)",
          }}
        >
          No per-page “last modified”: nothing at runtime knows it, and a
          plausible-looking timestamp would be worse than none. Build{" "}
          <code>{process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}</code>.
        </p>
      </Section>
    </main>
  );
}
