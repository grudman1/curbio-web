import type { Metadata } from "next";
import { readRecentLeads, recentCrmFailures, type LeadRow } from "@/lib/adminLeads";
import { listPendingUsers, type AdminUser } from "@/lib/adminAuth";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { logout } from "../login/actions";
import { approveUserAction, denyUserAction } from "../actions";
import { AlertBanner, type AlertEntry } from "./AlertBanner";
import { OpsShell } from "../_ui/v2";
import { currentAdminUser } from "../_ui/session";
import { Panel } from "../_ui/primitives";
import { SCAN } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// The admin shell — ONE implementation, shared by every screen.
//
// Was two: this file rendered a centred column with top tabs, and
// app/(site)/marketing/(hub)/layout.tsx rendered a sidebar with its own header
// controls and its own timeframe. Same session, same user, same data. The
// sidebar now lives in _ui/AppShell.tsx and the Marketing Hub's screens are
// being ported into it. As of the ops redesign this renders OpsShell (_ui/v2),
// which carries the design system and the brand fonts on its own root;
// AppShell is left untouched because marketing imports PageHeader from it.
//
// THE ALERT BANNER STAYS A BANNER. It was briefly moved behind a notification
// bell in the header; that was a bad trade twice over. The bell HID a signal
// that wants to be seen — a CRM delivery failure is a lost lead — and the
// space argument for hiding it was simply wrong: AlertBanner already returns
// null when there is nothing to report, so on a healthy day it has always
// cost zero. Same for the access-requests panel below it.
//
// The ALERT BANNER stays first-thing-on-screen. Its lead data comes from the
// same cache()-deduped readRecentLeads() the Leads screen uses — one Redis
// read per request, not one per section.
//
// Auth: middleware session gate (lib/adminSession.ts). Reads stay on the
// READ-ONLY Upstash credential — nothing under this layout can write to the
// lead store.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Ops — Curbio",
  robots: { index: false, follow: false },
};

function failureEntries(rows: LeadRow[]): AlertEntry[] {
  return recentCrmFailures(rows).map((f) => ({
    id: f.leadId,
    time: f.time,
    summary: f.summary,
    detail: f.detail,
  }));
}

function PendingRequestsPanel({ pending }: { pending: AdminUser[] }) {
  return (
    <Panel title="Access requests" right={<span className="font-sans text-ops-label tabular-nums text-content-subtle">{pending.length} pending</span>}>
      <div>
        {pending.map((u) => (
          <div
            key={u.email}
            className="flex h-ops-row items-center gap-2.5 border-b border-app-border font-sans text-ops-body last:border-b-0"
          >
            <span className="flex-1 truncate">{u.email}</span>
            <span className="font-sans text-ops-micro tabular-nums text-content-subtle">
              {u.createdAt.slice(0, 10)}
            </span>
            <form action={approveUserAction}>
              <input type="hidden" name="email" value={u.email} />
              <button
                type="submit"
                className="cursor-pointer rounded-pill bg-accent px-3 py-[4px] font-sans text-ops-micro font-bold text-content-on-accent transition-colors duration-base ease-out hover:bg-accent-hover"
              >
                Approve
              </button>
            </form>
            <form action={denyUserAction}>
              <input type="hidden" name="email" value={u.email} />
              <button
                type="submit"
                className="cursor-pointer rounded-pill border border-app-border-strong bg-transparent px-3 py-[4px] font-sans text-ops-micro font-bold text-content-muted transition-colors duration-base ease-out hover:border-content hover:text-content"
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const leads = await readRecentLeads(SCAN);
  const rows = leads.configured && !leads.error ? leads.rows : [];
  const storeError = leads.configured && leads.error ? leads.error : null;
  const alerts = failureEntries(rows);
  const [me, pending] = await Promise.all([currentAdminUser(), listPendingUsers()]);
  const isOwner = me?.role === "owner";

  return (
    // OpsShell owns the `.ops` scope and the brand font variables on its own
    // root — admin's names, applied inside admin. The marketing site's global
    // --font-serif / --font-sans stay exactly as app/layout.tsx sets them.
    <OpsShell
      months={SNAPSHOT_MONTHS}
      user={me}
      leadCount={rows.length || undefined}
      signOut={logout}
    >
      <AlertBanner entries={alerts} storeError={storeError} />

      {/* Owner-only DISPLAY; the real gate is requireOwnerSession() on every
          mutation, which re-derives role rather than trusting this. */}
      {isOwner && pending.length > 0 && (
        <div className="mb-4">
          <PendingRequestsPanel pending={pending} />
        </div>
      )}

      {children}
    </OpsShell>
  );
}
