import type { Metadata } from "next";
import { readRecentLeads, recentCrmFailures, type LeadRow } from "@/lib/adminLeads";
import { listPendingUsers } from "@/lib/adminAuth";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { logout } from "../login/actions";
import { OpsShell, type OpsAlert } from "../_ui/v2";
import { currentAdminUser } from "../_ui/session";
import { SCAN } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// The admin shell — ONE implementation, shared by every screen.
//
// Renders OpsShell (_ui/v2), which carries the ops design system and the brand
// fonts on its own root. AppShell is deliberately untouched: marketing imports
// PageHeader from it, so it may not be restyled this pass.
//
// ALERTS ARE NOT BANNERS ANY MORE. CRM delivery failures, an unreadable lead
// store and pending access requests all used to render full-width at the top
// of every screen — permanent vertical cost for something usually empty. They
// are notification-tray entries now (the bell in OpsShell's header), and the
// unread dot is what says there is something to see.
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

/** CRM delivery failures + the lead store's own health, as tray entries.
 *  These used to be a full-width banner on every screen; see OpsShell. */
function failureEntries(rows: LeadRow[], storeError: string | null): OpsAlert[] {
  const out: OpsAlert[] = [];
  if (storeError) {
    out.push({
      id: "lead-store",
      kind: "error",
      title: "Lead store unreadable",
      meta: storeError,
      href: "/admin/leads",
    });
  }
  for (const f of recentCrmFailures(rows)) {
    out.push({
      id: f.leadId,
      kind: "error",
      title: f.summary,
      meta: f.time,
      href: "/admin/leads",
    });
  }
  return out;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const leads = await readRecentLeads(SCAN);
  const rows = leads.configured && !leads.error ? leads.rows : [];
  const storeError = leads.configured && leads.error ? leads.error : null;
  const [me, pending] = await Promise.all([currentAdminUser(), listPendingUsers()]);
  const isOwner = me?.role === "owner";

  // Owner-only VISIBILITY; the real gate is requireOwnerSession() on every
  // mutation, which re-derives role rather than trusting this.
  const alerts: OpsAlert[] = [
    ...failureEntries(rows, storeError),
    ...(isOwner && pending.length > 0
      ? [
          {
            id: "access-requests",
            kind: "warning" as const,
            title: `${pending.length} access request${pending.length === 1 ? "" : "s"} pending`,
            meta: pending.map((u) => u.email).join(", "),
            href: "/admin/settings",
          },
        ]
      : []),
  ];

  return (
    <OpsShell
      months={SNAPSHOT_MONTHS}
      user={me}
      leadCount={rows.length || undefined}
      signOut={logout}
      alerts={alerts}
    >
      {children}
    </OpsShell>
  );
}
