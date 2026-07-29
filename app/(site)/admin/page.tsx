import type { Metadata } from "next";
import { cookies } from "next/headers";
import { readRecentLeads, maskName, deliveryState, type LeadRow } from "@/lib/adminLeads";
import { buildPageRegistry, type RegistryEntry } from "@/config/pageRegistry";
import { getSessionUser, listPendingUsers, sessionSecret, type AdminUser } from "@/lib/adminAuth";
import { SESSION_COOKIE, openSession } from "@/lib/adminSession";
import { logout } from "./login/actions";
import { approveUserAction, denyUserAction } from "./actions";

// ─────────────────────────────────────────────────────────────────────────────
// /admin — the Control Room.
//
// One dense screen, left open on a second monitor: alert strip (silent when
// healthy, unmissable on CRM rejections) → the numbers → what referral values
// are actually arriving → the lead feed → the site itself as live previews →
// the nav-promised backlog as ghost cards.
//
// Styled to the Curbio design system — cloud-white canvas, white cards, Lora
// headline with the amber rule, eyebrow labels, amber as accent only. Same
// system as the landing pages; this is the daytime version of it, not a
// separate dark aesthetic.
//
// PREVIEWS are iframes sandboxed WITHOUT allow-scripts: genuinely current
// (the real deployed page, not a screenshot) and analytics can never fire
// from them — no JS runs. allow-same-origin is granted only so stylesheets
// apply; with scripting disabled the document cannot act on that origin.
// Picker-mode roots render only a skeleton server-side, so their cards
// preview a concrete per-market variant, labelled. What you see is the
// server HTML — live visitors additionally get client-side market resolution.
//
// Auth: middleware session gate (lib/adminSession.ts). Reads stay on the
// READ-ONLY Upstash credential — this page cannot write to the lead store.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Control Room — Curbio",
  robots: { index: false, follow: false },
};

// References the token (app/globals.css) rather than duplicating the font
// stack locally — a hardcoded copy here had drifted from the design
// system's declared value (wrong SF Mono spelling, missing the Windows
// Consolas fallback) until this was pointed at the single source of truth.
const mono = "var(--font-mono)";
const OK = "var(--color-state-success)";
const FAIL = "var(--color-state-error)";
const WARN = "var(--color-accent)";
const MUTED = "var(--color-text-muted)";
const SUBTLE = "var(--color-text-subtle)";

// How many recent leads feed the aggregates. Labelled everywhere it is shown —
// these are "last N" numbers, never dressed up as all-time analytics.
const SCAN = 200;

type Aggregates = {
  scanned: number;
  last24h: number;
  last7d: number;
  delivered: number;
  failed: number;
  storedOnly: number;
  unknown: number;
  verified: number;
  unverified: number;
  untagged: number;
  failures: LeadRow[];
  referralValues: { value: string; count: number; known: boolean }[];
};

function aggregate(rows: LeadRow[]): Aggregates {
  const now = Date.now();
  const DAY = 86_400_000;
  const a: Aggregates = {
    scanned: rows.length,
    last24h: 0,
    last7d: 0,
    delivered: 0,
    failed: 0,
    storedOnly: 0,
    unknown: 0,
    verified: 0,
    unverified: 0,
    untagged: 0,
    failures: [],
    referralValues: [],
  };
  const refs = new Map<string, { count: number; known: boolean }>();

  for (const row of rows) {
    const t = row.lead.submittedAt ? Date.parse(row.lead.submittedAt) : NaN;
    if (Number.isFinite(t)) {
      if (now - t < DAY) a.last24h++;
      if (now - t < 7 * DAY) a.last7d++;
    }
    const d = row.delivery;
    if (!d) a.unknown++;
    else if (d.crmAttempted && d.crmOk) a.delivered++;
    else if (d.crmAttempted && !d.crmOk) {
      a.failed++;
      a.failures.push(row);
    } else a.storedOnly++;

    const v = row.lead.referralSourceVerified;
    if (v === undefined) a.untagged++;
    else if (v) a.verified++;
    else a.unverified++;

    const rid = row.lead.referralSourceId;
    if (rid) {
      const cur = refs.get(rid) ?? { count: 0, known: row.lead.referralSourceVerified === true };
      cur.count++;
      refs.set(rid, cur);
    }
  }
  a.referralValues = [...refs.entries()]
    .map(([value, { count, known }]) => ({ value, count, known }))
    .sort((x, y) => y.count - x.count);
  return a;
}

// ── Previews ────────────────────────────────────────────────────────────────
// Registry path → the concrete URL worth looking at. Per-market rows fold
// into their parent card as a "×7 markets" badge.
function previewPlan(entries: RegistryEntry[]) {
  const cards: { entry: RegistryEntry; src: string | null; note?: string; variants?: number }[] = [];
  for (const e of entries) {
    if (e.status === "planned") continue;
    if (e.path.includes(":market")) {
      const parent = cards.find((c) => e.path.startsWith(`${c.entry.path}/m/`));
      if (parent) {
        parent.variants = 7;
        continue;
      }
    }
    if (e.path === "/admin") {
      cards.push({ entry: e, src: null, note: "this page" });
      continue;
    }
    if (e.path === "/lp/sell") {
      cards.push({ entry: e, src: "/lp/sell/m/atlanta", note: "shown: atlanta variant" });
      continue;
    }
    if (e.path === "/exp") {
      cards.push({ entry: e, src: "/exp/m/atlanta", note: "shown: atlanta variant" });
      continue;
    }
    if (e.path === "/lp/:campaign/confirm") {
      cards.push({ entry: e, src: "/lp/sell/confirm?market=atlanta", note: "shown: sell/atlanta" });
      continue;
    }
    cards.push({ entry: e, src: e.path, note: e.note });
  }
  return cards;
}

function Frame({ src }: { src: string }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 10",
        overflow: "hidden",
        background: "var(--color-surface-raised)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <iframe
        src={src}
        title={src}
        loading="lazy"
        sandbox="allow-same-origin"
        style={{
          width: 1200,
          height: 750,
          border: 0,
          transform: "scale(0.2333)",
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function Chip({ text, color, dashed = false }: { text: string; color: string; dashed?: boolean }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color,
        border: `1px ${dashed ? "dashed" : "solid"} ${color}`,
        borderRadius: "var(--radius-pill)",
        padding: "2px 8px",
        whiteSpace: "nowrap",
        background: "var(--color-surface-raised)",
      }}
    >
      {text}
    </span>
  );
}

function statusChip(e: RegistryEntry) {
  if (e.status === "live") return <Chip text="live" color={OK} />;
  if (e.status === "stub") return <Chip text="stub · renders" color={WARN} />;
  return <Chip text="planned" color={SUBTLE} dashed />;
}

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-label)",
  fontWeight: 800,
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  color: MUTED,
  margin: 0,
};

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-raised)",
        padding: "var(--space-4) var(--space-5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={eyebrow}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: "var(--text-micro)", color: SUBTLE }}>{children}</span>;
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div style={{ minWidth: 86 }}>
      <div
        style={{
          fontFamily: mono,
          fontSize: 28,
          fontWeight: 600,
          color: tone ?? "var(--color-text)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "var(--text-micro)", color: SUBTLE, marginTop: 5 }}>{label}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 style={{ ...eyebrow, margin: "0 0 10px" }}>{children}</h2>;
}

/**
 * The middleware already guarantees a valid session before this page renders
 * — this re-reads it purely for DISPLAY (whose email shows, whether the
 * approve/deny panel appears). It is not a security boundary; the actual
 * boundary is requireOwnerSession() in actions.ts, which re-derives role
 * independently for every mutation rather than trusting anything rendered
 * here.
 */
async function currentAdminUser(): Promise<{ email: string; role: string } | null> {
  const jar = await cookies();
  const opened = await openSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  if (!opened) return null;
  const session = await getSessionUser(opened.sid);
  return session ? { email: session.email, role: session.role } : null;
}

function PendingRequestsPanel({ pending }: { pending: AdminUser[] }) {
  return (
    <Panel title="Access requests" right={<Meta>{pending.length} pending</Meta>}>
      {pending.length === 0 ? (
        <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
          No pending requests.
        </p>
      ) : (
        <div>
          {pending.map((u) => (
            <div
              key={u.email}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--color-border)",
                fontSize: "var(--text-small)",
              }}
            >
              <span style={{ flex: 1 }}>{u.email}</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: SUBTLE }}>
                {u.createdAt.slice(0, 10)}
              </span>
              <form action={approveUserAction}>
                <input type="hidden" name="email" value={u.email} />
                <button
                  type="submit"
                  className="cursor-pointer rounded-pill bg-accent px-3 py-[5px] font-sans text-[12px] font-bold text-content-on-accent transition-colors duration-base ease-out hover:bg-accent-hover active:bg-accent-active"
                >
                  Approve
                </button>
              </form>
              <form action={denyUserAction}>
                <input type="hidden" name="email" value={u.email} />
                <button
                  type="submit"
                  className="cursor-pointer rounded-pill border border-edge-strong bg-transparent px-3 py-[5px] font-sans text-[12px] font-bold text-content-muted transition-colors duration-base ease-out hover:border-content hover:text-content"
                >
                  Deny
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default async function AdminPage() {
  const leads = await readRecentLeads(SCAN);
  const rows = leads.configured && !leads.error ? leads.rows : [];
  const agg = aggregate(rows);
  const registry = buildPageRegistry();
  const cards = previewPlan(registry);
  const planned = registry.filter((e) => e.status === "planned");
  const [me, pending] = await Promise.all([
    currentAdminUser(),
    // listPendingUsers() is cheap at this scale and the panel below only
    // renders it for owners — fetched unconditionally rather than branched
    // so a role check bug can't accidentally show a stale/empty list instead
    // of just not rendering the panel.
    listPendingUsers(),
  ]);
  const isOwner = me?.role === "owner";
  const groups: { key: string; label: string }[] = [
    { key: "campaigns", label: "Campaign tier — sell.curbio.com" },
    { key: "site", label: "Site tier — curbio.com (post-cutover)" },
    { key: "internal", label: "Internal" },
  ];
  const renderedAt = new Date().toISOString().replace("T", " ").replace(/\..*/, " UTC");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-surface)",
        color: "var(--color-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 28px 96px" }}>
        {/* ── header ── */}
        <header style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <h1
              style={{
                fontFamily: "var(--font-family-serif)",
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: "var(--tracking-heading)",
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              Control Room
            </h1>
            <span style={{ fontFamily: mono, fontSize: 12, color: SUBTLE }}>
              build {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"} ·{" "}
              {process.env.VERCEL_ENV ?? "dev"} · rendered {renderedAt}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: MUTED }}>
              {me?.email}
              {isOwner && (
                <span style={{ color: SUBTLE }}> · owner</span>
              )}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="cursor-pointer rounded-pill border-[1.5px] border-content bg-transparent px-4 py-[7px] font-sans text-[12.5px] font-bold text-content transition-colors duration-base ease-out hover:bg-content hover:text-content-on-accent"
              >
                Sign out
              </button>
            </form>
          </div>
          <span
            aria-hidden
            style={{
              display: "block",
              width: 48,
              height: 3,
              background: "var(--color-accent)",
              borderRadius: 2,
              marginTop: 12,
            }}
          />
          <p style={{ fontSize: "var(--text-micro)", color: SUBTLE, margin: "8px 0 0" }}>
            read-only · identities masked · aggregates cover the last {agg.scanned || SCAN} leads
          </p>
        </header>

        {/* ── alert strip: silent when healthy ── */}
        {leads.configured && leads.error ? (
          <div
            style={{
              background: "rgba(226,75,74,0.08)",
              border: `1px solid ${FAIL}`,
              borderRadius: "var(--radius-lg)",
              padding: "14px 18px",
              marginBottom: "var(--space-5)",
              fontSize: "var(--text-small)",
            }}
          >
            <strong style={{ color: FAIL }}>Lead store unreadable:</strong> {leads.error} — this is
            an admin read failure, not proof the pipeline is down. Check /api/lead logs before
            assuming leads are lost.
          </div>
        ) : agg.failed > 0 ? (
          <div
            style={{
              background: "rgba(226,75,74,0.08)",
              border: `2px solid ${FAIL}`,
              borderRadius: "var(--radius-lg)",
              padding: "16px 20px",
              marginBottom: "var(--space-5)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: FAIL, marginBottom: 8 }}>
              ⚠ {agg.failed} CRM rejection{agg.failed > 1 ? "s" : ""} in the last {agg.scanned}{" "}
              leads
            </div>
            {agg.failures.slice(0, 5).map(({ lead, delivery }, i) => (
              <div
                key={lead.leadId ?? i}
                style={{ fontFamily: mono, fontSize: 12, color: MUTED, padding: "2px 0" }}
              >
                {lead.submittedAt?.slice(0, 16).replace("T", " ")} · {lead.market ?? "?"} ·{" "}
                {lead.source ?? "?"} · HTTP {delivery?.crmStatus ?? "?"} —{" "}
                {delivery?.crmError ?? "no body"}
              </div>
            ))}
            <div style={{ fontSize: "var(--text-micro)", color: MUTED, marginTop: 6 }}>
              Every one is persisted in Redis and alerted by email — recoverable, not lost.
            </div>
          </div>
        ) : null}

        {/* ── pending access requests: owner-only display, but the real gate
             is requireOwnerSession() re-checking on every mutation ── */}
        {isOwner && pending.length > 0 && (
          <div style={{ marginBottom: "var(--space-5)" }}>
            <PendingRequestsPanel pending={pending} />
          </div>
        )}

        {/* ── numbers row ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <Panel
            title="Volume"
            right={<Meta>{leads.configured ? `${leads.total} stored` : "no store"}</Meta>}
          >
            <div style={{ display: "flex", gap: 30 }}>
              <Stat label="last 24 h" value={leads.configured ? agg.last24h : "—"} />
              <Stat label="last 7 d" value={leads.configured ? agg.last7d : "—"} />
              <Stat label={`scanned (last ${agg.scanned})`} value={leads.configured ? agg.scanned : "—"} />
            </div>
          </Panel>
          <Panel title="Delivery" right={<Meta>last {agg.scanned} leads</Meta>}>
            <div style={{ display: "flex", gap: 30 }}>
              <Stat label="delivered" value={agg.delivered} tone={OK} />
              <Stat label="CRM failed" value={agg.failed} tone={agg.failed ? FAIL : undefined} />
              <Stat label="pre-observability" value={agg.unknown} tone={SUBTLE} />
            </div>
          </Panel>
          <Panel title="Attribution" right={<Meta>referral source tag</Meta>}>
            <div style={{ display: "flex", gap: 30 }}>
              <Stat label="verified" value={agg.verified} tone={OK} />
              <Stat label="unverified" value={agg.unverified} tone={agg.unverified ? WARN : undefined} />
              <Stat label="untagged (pre-tag)" value={agg.untagged} tone={SUBTLE} />
            </div>
          </Panel>
        </div>

        {/* ── attribution detail + feed ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 2fr) minmax(420px, 3fr)",
            gap: 12,
            marginBottom: "var(--space-8)",
          }}
        >
          <Panel title="Referral sources arriving" right={<Meta>raw values, last {agg.scanned}</Meta>}>
            {agg.referralValues.length === 0 ? (
              <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
                No referral source data in range.
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {agg.referralValues.map((r) => (
                    <tr key={r.value}>
                      <td style={{ padding: "6px 0", fontFamily: mono, fontSize: 13 }}>{r.value}</td>
                      <td
                        style={{
                          padding: "6px 8px",
                          textAlign: "right",
                          fontFamily: mono,
                          fontSize: 13,
                          color: MUTED,
                        }}
                      >
                        {r.count}
                      </td>
                      <td style={{ padding: "6px 0", textAlign: "right" }}>
                        {r.known ? (
                          <Chip text="known" color={OK} />
                        ) : (
                          <Chip text="unrecognised" color={WARN} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ fontSize: "var(--text-micro)", color: SUBTLE, margin: "10px 0 0" }}>
              Every value is kept verbatim and tagged, never dropped — this is where the ~40
              go.curbio.com vanity-redirect values become visible before anything is standardised.
            </p>
          </Panel>

          <Panel title="Lead feed" right={<Meta>newest 25</Meta>}>
            {!leads.configured ? (
              <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
                Upstash not configured in this environment.
              </p>
            ) : (
              <div>
                {rows.slice(0, 25).map(({ lead, delivery }, i) => {
                  const st = deliveryState(delivery);
                  const tone =
                    st.tone === "ok" ? OK : st.tone === "fail" ? FAIL : st.tone === "warn" ? WARN : SUBTLE;
                  return (
                    <div
                      key={lead.leadId ?? i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "104px 110px 1fr auto auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--color-border)",
                        fontSize: "var(--text-small)",
                      }}
                    >
                      <span style={{ fontFamily: mono, fontSize: 12, color: SUBTLE }}>
                        {lead.submittedAt?.slice(5, 16).replace("T", " ") ?? "—"}
                      </span>
                      <span style={{ color: MUTED }}>{maskName(lead)}</span>
                      <span
                        style={{
                          color: MUTED,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lead.market ?? "—"} · {lead.source ?? "—"}
                        {lead.utm_campaign ? ` · ${lead.utm_campaign}` : ""}
                      </span>
                      <Chip text={st.label} color={tone} />
                      {lead.referralSourceVerified === false ? (
                        <Chip text="unverified" color={WARN} />
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* ── the site itself ── */}
        {groups.map((g) => {
          const inGroup = cards.filter((c) => c.entry.group === g.key);
          if (!inGroup.length) return null;
          return (
            <section key={g.key} style={{ marginBottom: "var(--space-8)" }}>
              <SectionHeading>{g.label}</SectionHeading>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                  gap: 14,
                }}
              >
                {inGroup.map((c) => (
                  <a
                    key={c.entry.path}
                    href={c.src ?? c.entry.path}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      boxShadow: "var(--elevation-raised)",
                      overflow: "hidden",
                      textDecoration: "none",
                      color: "var(--color-text)",
                    }}
                  >
                    {c.src ? (
                      <Frame src={c.src} />
                    ) : (
                      <div
                        style={{
                          aspectRatio: "16 / 10",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: SUBTLE,
                          fontSize: "var(--text-small)",
                          background: "var(--color-surface)",
                          borderBottom: "1px solid var(--color-border)",
                        }}
                      >
                        {c.note ?? c.entry.path}
                      </div>
                    )}
                    <div
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontFamily: mono, fontSize: 12.5 }}>{c.entry.path}</span>
                      {statusChip(c.entry)}
                      {c.variants && <Chip text={`×${c.variants} markets`} color={MUTED} />}
                      {c.entry.indexed && <Chip text="indexed" color={WARN} />}
                      {c.note && c.src && (
                        <span style={{ fontSize: 10.5, color: SUBTLE, width: "100%" }}>{c.note}</span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })}

        {/* ── the backlog: promised by the nav, not yet built ── */}
        <section>
          <SectionHeading>Backlog — linked in the nav, not built ({planned.length})</SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 10,
            }}
          >
            {planned.map((e) => (
              <div
                key={e.path}
                style={{
                  border: "1px dashed var(--color-border-strong)",
                  borderRadius: "var(--radius-lg)",
                  padding: "14px 14px",
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-text)" }}>
                  {e.path}
                </div>
                <div style={{ fontSize: "var(--text-micro)", color: MUTED, marginTop: 4 }}>
                  {e.title}
                </div>
                {e.note && (
                  <div style={{ fontSize: "var(--text-micro)", color: SUBTLE, marginTop: 6 }}>
                    {e.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
