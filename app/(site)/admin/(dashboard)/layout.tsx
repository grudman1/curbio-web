import type { Metadata } from "next";
import { cookies } from "next/headers";
import { readRecentLeads, type LeadRow } from "@/lib/adminLeads";
import { getSessionUser, listPendingUsers, sessionSecret, type AdminUser } from "@/lib/adminAuth";
import { SESSION_COOKIE, openSession } from "@/lib/adminSession";
import { logout } from "../login/actions";
import { approveUserAction, denyUserAction } from "../actions";
import { AlertBanner, type AlertEntry } from "./AlertBanner";
import { Tabs } from "./Tabs";
import { Meta, MUTED, Panel, SCAN, SUBTLE } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// Control Room shell — shared by every tab.
//
// Three tabs, each a real route: Pages (landing view — is the site healthy,
// what's live, what's backlog), Leads (feed + delivery/attribution stats),
// Design System (token reference, still reachable at /admin/design-system).
//
// The ALERT BANNER renders here, directly under the header, so it is the
// first thing on screen no matter which tab is open. Its lead data comes
// from the same cache()-deduped readRecentLeads() call the Leads tab uses —
// one Redis read per request, not one per section.
//
// Auth: middleware session gate (lib/adminSession.ts). Reads stay on the
// READ-ONLY Upstash credential — nothing under this layout can write to the
// lead store.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Control Room — Curbio",
  robots: { index: false, follow: false },
};

/**
 * The middleware already guarantees a valid session before this layout
 * renders — this re-reads it purely for DISPLAY (whose email shows, whether
 * the approve/deny panel appears). It is not a security boundary; the actual
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

// ── Banner source (a): CRM delivery failures, last 24 h ─────────────────────
// Scans the same "last SCAN leads" window as the aggregates. If more than
// SCAN leads ever arrive inside one day, the oldest same-day failures fall
// out of this scan — they remain visible in the Leads tab counts, and the
// failure-alert email fires per incident regardless.
function failureEntries(rows: LeadRow[]): AlertEntry[] {
  const DAY = 86_400_000;
  const now = Date.now();
  const out: AlertEntry[] = [];
  for (const { lead, delivery } of rows) {
    if (!delivery?.crmAttempted || delivery.crmOk) continue;
    const t = Date.parse(lead.submittedAt ?? "") || Date.parse(delivery.recordedAt ?? "");
    if (!Number.isFinite(t) || now - t >= DAY) continue;
    out.push({
      id: delivery.leadId,
      time: (lead.submittedAt ?? delivery.recordedAt).slice(5, 16).replace("T", " "),
      summary: `${lead.market ?? "?"} · ${lead.source ?? "?"} · HTTP ${delivery.crmStatus ?? "?"}`,
      detail: delivery.crmError ?? "no body",
    });
  }
  return out;
}

function PendingRequestsPanel({ pending }: { pending: AdminUser[] }) {
  return (
    <Panel title="Access requests" right={<Meta>{pending.length} pending</Meta>}>
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
            <span style={{ fontSize: "var(--text-label)", color: SUBTLE }}>
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
    </Panel>
  );
}

export default async function ControlRoomLayout({ children }: { children: React.ReactNode }) {
  const leads = await readRecentLeads(SCAN);
  const rows = leads.configured && !leads.error ? leads.rows : [];
  const storeError = leads.configured && leads.error ? leads.error : null;
  const alerts = failureEntries(rows);
  const [me, pending] = await Promise.all([
    currentAdminUser(),
    // listPendingUsers() is cheap at this scale and the panel below only
    // renders it for owners — fetched unconditionally rather than branched
    // so a role check bug can't accidentally show a stale/empty list instead
    // of just not rendering the panel.
    listPendingUsers(),
  ]);
  const isOwner = me?.role === "owner";

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
        {/* ── header: title, signed-in user, sign-out. Nothing else. ── */}
        <header style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <h1
              style={{
                fontFamily: "var(--font-family-serif)",
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "var(--tracking-heading)",
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              Control Room
            </h1>
            <span style={{ marginLeft: "auto", fontSize: "var(--text-small)", color: MUTED }}>
              {me?.email}
              {isOwner && <span style={{ color: SUBTLE }}> · owner</span>}
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
              marginTop: 14,
            }}
          />
        </header>

        {/* ── alert banner: absent when healthy, first thing seen when not ── */}
        <AlertBanner entries={alerts} storeError={storeError} />

        {/* ── pending access requests: owner-only display, but the real gate
             is requireOwnerSession() re-checking on every mutation ── */}
        {isOwner && pending.length > 0 && (
          <div style={{ marginBottom: "var(--space-5)" }}>
            <PendingRequestsPanel pending={pending} />
          </div>
        )}

        <Tabs />

        {children}
      </main>
    </div>
  );
}
