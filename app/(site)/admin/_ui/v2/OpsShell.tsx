import { ADMIN_NAV } from "@/config/adminNav";
import { Sidebar } from "../Sidebar";
import { AttributionToggle, Timeframe } from "../HeaderControls";
import { CommandPalette } from "../CommandPalette";
import { ToastProvider } from "../Toast";
import { opsFontVars } from "./fonts";
import { OpsSearchButton } from "./OpsSearchButton";
import { OpsNotifications, type OpsAlert } from "./OpsNotifications";
import { OpsUserMenu } from "./OpsUserMenu";
import "./tokens.css";

// ─────────────────────────────────────────────────────────────────────────────
// THE OPS SHELL — sidebar + header + content, on the new design system.
//
// ── Why this is a new file and not an edit to AppShell.tsx ──────────────────
// app/(site)/marketing/(hub)/hubUi.tsx imports `PageHeader` from AppShell.tsx.
// That makes AppShell a file the marketing site reads, and this pass may not
// change how sell.curbio.com renders — so AppShell is left byte-identical and
// the redesigned shell lives here instead. AppShell's own `AppShell` export is
// now unused; the follow-on pass that migrates the remaining screens should
// move `PageHeader` to its own module and delete it.
//
// The `.ops` class on the root is what scopes the entire design system (see
// tokens.css) — every screen rendered inside this shell can use `.ops-*`
// classes, which is the point: Leads, Markets, Performance and Channels adopt
// them next pass without touching this file.
//
// ── The header ─────────────────────────────────────────────────────────────
// Left: the two controls that govern EVERY screen (timeframe, attribution).
// Right: search, notifications, account. Nothing page-specific lives up here.
//
// ALERTS MOVED BEHIND THE BELL. CRM delivery failures and pending access
// requests used to render as full-width banners at the top of every admin
// screen — permanent vertical cost for something that is usually empty. They
// are the notification tray's contents now, and the bell carries an unread
// dot only when there is something to see.
// ─────────────────────────────────────────────────────────────────────────────

export function OpsShell({
  children,
  months,
  user,
  leadCount,
  signOut,
  alerts,
}: {
  children: React.ReactNode;
  /** Ascending "YYYY-MM" with data — the month options the header offers. */
  months: string[];
  user: { email: string; role: string } | null;
  leadCount?: number;
  signOut: () => Promise<void>;
  /** CRM failures + access requests, for the notification tray. */
  alerts: OpsAlert[];
}) {
  return (
    <ToastProvider>
      <div
        className={`ops ${opsFontVars} flex min-h-screen flex-col md:flex-row`}
        style={{ background: "var(--ops-bg)" }}
      >
        <Sidebar items={ADMIN_NAV} leadCount={leadCount} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="sticky top-0 z-header flex flex-none items-center gap-3 border-b px-4 py-3 md:px-6"
            style={{ borderColor: "var(--ops-border)", background: "var(--ops-surface)" }}
          >
            {/* Governs every screen at once, which is why it lives here and on
                no page. State is in the URL and is carried across every nav
                link, so moving between screens never resets the timeframe. */}
            <div className="flex min-w-0 items-center gap-2.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="flex-none">
                <Timeframe months={months} />
              </span>
              <span className="flex-none">
                <AttributionToggle />
              </span>
            </div>

            <div className="ml-auto flex flex-none items-center gap-2.5">
              <OpsSearchButton />
              <OpsNotifications alerts={alerts} />
              <OpsUserMenu email={user?.email ?? null} signOut={signOut} />
            </div>
          </header>

          <main className="min-w-0 flex-1 p-4 md:p-6">
            <div className="mx-auto max-w-[1536px]">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
    </ToastProvider>
  );
}
