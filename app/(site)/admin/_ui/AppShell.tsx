import { ADMIN_NAV } from "@/config/adminNav";
import { Sidebar, type SidebarUser } from "./Sidebar";
import { AttributionToggle, Timeframe } from "./HeaderControls";
import { CommandPalette } from "./CommandPalette";
import { ToastProvider } from "./Toast";
import { PaletteHint } from "./PaletteHint";

// No separate display name exists anywhere in the session (lib/adminAuth.ts's
// AdminUser is just email + role) — the sidebar's user chip shows the email
// itself rather than inventing a first name that isn't there.
function sidebarUserFrom(user: { email: string; role: string } | null): SidebarUser {
  const email = user?.email ?? "";
  const local = email.split("@")[0] || "?";
  return { initials: local.slice(0, 2).toUpperCase(), name: email || "Signed in", role: user?.role ?? "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// ONE shell. Sidebar + header + content, one implementation, every screen.
//
// The header holds only what governs EVERY screen: timeframe, attribution
// mode, ⌘K, and who is signed in. Nothing page-specific lives up here.
//
// The shell also mounts the app-wide client furniture: ToastProvider (every
// write's feedback) and the command palette.
// ─────────────────────────────────────────────────────────────────────────────

export function AppShell({
  children,
  months,
  user,
  leadCount,
  signOut,
}: {
  children: React.ReactNode;
  /** Ascending "YYYY-MM" with data — the month options the header offers. */
  months: string[];
  user: { email: string; role: string } | null;
  leadCount?: number;
  signOut: () => Promise<void>;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-app-bg font-sans text-content md:flex-row">
        <Sidebar items={ADMIN_NAV} user={sidebarUserFrom(user)} leadCount={leadCount} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-header flex h-ops-header flex-none items-center gap-3 border-b border-app-border bg-app-card px-4 md:px-6">
            {/* These govern EVERY screen at once, which is why they live here
                and on no page. State is in the URL and is carried across every
                nav link, so moving between screens never resets the
                timeframe. */}
            <div className="flex min-w-0 items-center gap-2.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="flex-none">
                <Timeframe months={months} />
              </span>
              <span className="flex-none">
                <AttributionToggle />
              </span>
            </div>

            <div className="ml-auto flex flex-none items-center gap-2.5">
              <PaletteHint />
              <span className="hidden whitespace-nowrap font-sans text-[12px] text-nav3-muted-text lg:inline">
                {user?.email}
                {user?.role === "owner" && <span className="text-[11px] text-nav3-gray-400"> · owner</span>}
              </span>
              <form action={signOut} className="flex-none">
                <button
                  type="submit"
                  className="cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-sans text-[12px] font-medium text-nav3-muted-text underline-offset-2 transition-colors duration-fast ease-out hover:text-nav3-hover-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pb-24 pt-5 md:px-6">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
    </ToastProvider>
  );
}

/** Page title + optional right-hand controls. Sans — serif does not appear in
 *  the app (DESIGN-APP.md). */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  /** ONE line. Provenance or window, never explanation — that goes in an
   *  InfoPopover. The prose budget is enforced here by having nowhere to put
   *  a paragraph. */
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="min-w-0">
        <h1 className="m-0 font-sans text-ops-title font-bold text-content">{title}</h1>
        {subtitle && (
          <div className="mt-0.5 font-sans text-ops-label text-content-subtle">{subtitle}</div>
        )}
      </div>
      {right && <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}
