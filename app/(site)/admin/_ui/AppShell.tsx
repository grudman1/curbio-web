import { Sidebar } from "./Sidebar";
import { AttributionToggle, Timeframe } from "./HeaderControls";

// ─────────────────────────────────────────────────────────────────────────────
// ONE shell. Sidebar + header + content, one implementation, every screen.
//
// Replaces two: the Control Room's centred column with top tabs, and the
// Marketing Hub's sidebar with its own header controls. Same session, same
// data — there was never a reason for two mental models.
//
// The header holds only what governs EVERY screen: timeframe, attribution
// mode, and who is signed in. Nothing page-specific lives up here.
//
// NOTE ON AMBER: the decorative amber rule that used to sit under the Control
// Room title is gone, and the sidebar's active state is navy. Inside /admin,
// amber means warning. See DECISIONS.md.
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
    <div className="flex min-h-screen flex-col bg-surface font-sans text-content md:flex-row">
      {/* The rail owns the logo now — it is the full-height navy element, so
          the brand belongs at its top rather than floating in the content
          header beside it. */}
      <Sidebar leadCount={leadCount} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-header flex h-ops-header flex-none items-center gap-3 border-b border-edge bg-surface-raised px-4 md:px-6">
          {/* These govern EVERY screen at once, which is why they live here and
              on no page. State is in the URL and is carried across every nav
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
            <span className="hidden whitespace-nowrap font-sans text-ops-label text-content-subtle lg:inline">
              {user?.email}
              {user?.role === "owner" && <span className="text-content-subtle"> · owner</span>}
            </span>
            <form action={signOut} className="flex-none">
              <button
                type="submit"
                className="cursor-pointer whitespace-nowrap rounded-pill border border-edge bg-transparent px-3 py-[5px] font-sans text-ops-label font-bold text-content-muted transition-colors duration-base ease-out hover:border-content hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
  );
}

/** Page title + optional right-hand controls. Serif, once per screen — one of
 *  only two places serif survives in the admin shell. */
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
        <h1 className="m-0 font-serif text-ops-title font-semibold text-content">{title}</h1>
        {subtitle && (
          <div className="mt-0.5 font-sans text-ops-label text-content-subtle">{subtitle}</div>
        )}
      </div>
      {right && <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}
