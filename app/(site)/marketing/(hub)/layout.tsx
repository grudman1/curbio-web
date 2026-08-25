import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { sessionSecret, touchSession } from "@/lib/adminAuth";
import { SESSION_COOKIE, openSession } from "@/lib/adminSession";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { HubControls } from "./HubControls";
import { Sidebar } from "./Sidebar";

// ─────────────────────────────────────────────────────────────────────────────
// Marketing control room shell — /marketing is its own destination, not a
// Control Room tab. Same session, same login, same place to revoke: the
// middleware gates /marketing/* with the exact /admin session check, and the
// header carries the way back.
//
// Layout: a fixed header (brand, back link, and — one level up from any page —
// the month selector and attribution toggle that govern every screen), a
// persistent left sidebar grouped by what you do with each screen, and the
// page itself. The sidebar collapses to icons under 1100px and becomes a top
// drawer on mobile; all of that lives in the CSS below, none of it in state.
//
// Design language is the Control Room's (app/(site)/admin/(dashboard)/ui.tsx)
// — serif headings, sans operations, navy on white, amber only as accent.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Marketing — Curbio",
  robots: { index: false, follow: false },
};

const MK_CSS = `
.mk-root { min-height: 100vh; background: var(--color-surface); color: var(--color-text); font-family: var(--font-sans); display: flex; flex-direction: column; }
.mk-header { display: flex; align-items: center; gap: 14px; padding: 0 24px; height: 58px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-raised); position: sticky; top: 0; z-index: 40; }
.mk-brand { display: flex; align-items: baseline; gap: 10px; white-space: nowrap; }
.mk-brand-eyebrow { font-family: var(--font-family-sans); font-size: var(--text-micro); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-subtle); }
.mk-brand-name { font-family: var(--font-family-serif); font-size: 20px; font-weight: 600; letter-spacing: var(--tracking-heading); color: var(--color-text); }
.mk-back { font-family: var(--font-family-sans); font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-decoration: none; border: 1px solid var(--color-border); border-radius: var(--radius-pill); padding: 4px 12px; white-space: nowrap; transition: color var(--duration-base) ease-out, border-color var(--duration-base) ease-out; }
.mk-back:hover { color: var(--color-text); border-color: var(--color-border-strong, var(--color-border)); }
.mk-controls { margin-left: auto; display: flex; align-items: center; gap: 12px; min-width: 0; }
.mk-body { display: flex; flex: 1; min-height: 0; align-items: stretch; }
.mk-nav { width: 218px; flex: none; border-right: 1px solid var(--color-border); padding: 18px 12px 48px; position: sticky; top: 58px; align-self: flex-start; max-height: calc(100vh - 58px); overflow-y: auto; }
.mk-group + .mk-group { margin-top: 20px; }
.mk-group-title { font-family: var(--font-family-sans); font-size: var(--text-micro); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-subtle); margin: 0 0 4px; padding: 0 10px; }
.mk-item { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 8px; text-decoration: none; font-family: var(--font-family-sans); font-size: 13px; font-weight: 600; color: var(--color-text-muted); position: relative; transition: color var(--duration-base) ease-out, background var(--duration-base) ease-out; }
.mk-item:hover { color: var(--color-text); }
.mk-item.is-active { color: var(--color-text); font-weight: 700; background: color-mix(in srgb, var(--color-accent) 9%, transparent); }
.mk-item.is-active::before { content: ""; position: absolute; left: 0; top: 7px; bottom: 7px; width: 2.5px; border-radius: 2px; background: var(--color-accent); }
.mk-icon { display: inline-flex; flex: none; color: currentColor; opacity: 0.75; }
.mk-item.is-active .mk-icon { opacity: 1; }
.mk-item-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mk-dot { width: 7px; height: 7px; border-radius: 999px; border: 1.5px solid; flex: none; }
.mk-main { flex: 1; min-width: 0; padding: 26px 32px 96px; max-width: 1320px; }
.mk-mobilebar { display: none; }
.mk-root a:focus-visible, .mk-root button:focus-visible, .mk-root select:focus-visible, .mk-root input:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

@media (max-width: 1100px) {
  .mk-nav { width: 58px; padding: 18px 8px 48px; }
  .mk-item { justify-content: center; padding: 9px 0; }
  .mk-item-label, .mk-group-title { display: none; }
  .mk-group + .mk-group { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--color-border); }
  .mk-dot { position: absolute; top: 5px; right: 7px; width: 6px; height: 6px; }
  .mk-item.is-active::before { top: 4px; bottom: 4px; }
}

@media (max-width: 719px) {
  .mk-header { padding: 0 16px; gap: 10px; flex-wrap: nowrap; }
  .mk-body { display: block; }
  .mk-mobilebar { display: block; border-bottom: 1px solid var(--color-border); background: var(--color-surface-raised); position: sticky; top: 58px; z-index: 30; }
  .mk-drawer-toggle { display: flex; align-items: center; gap: 9px; width: 100%; padding: 11px 16px; border: 0; background: transparent; font-family: var(--font-family-sans); font-size: 13px; font-weight: 700; color: var(--color-text); cursor: pointer; }
  .mk-nav { display: none; position: static; width: auto; max-height: none; overflow: visible; border-right: 0; border-bottom: 1px solid var(--color-border); padding: 4px 12px 16px; background: var(--color-surface-raised); }
  .mk-nav.is-open { display: block; }
  .mk-item { justify-content: flex-start; padding: 8px 10px; }
  .mk-item-label, .mk-group-title { display: block; }
  .mk-group + .mk-group { margin-top: 14px; padding-top: 0; border-top: 0; }
  .mk-dot { position: static; width: 7px; height: 7px; }
  .mk-main { padding: 20px 16px 80px; }
}

@media (prefers-reduced-motion: reduce) {
  .mk-root * { transition: none !important; }
}
`;

/**
 * Renew the session on a hub page load.
 *
 * The Control Room shell gets this for free — it reads the session to show who
 * is signed in, and getSessionUser() slides the TTL. This hub reads no session
 * at all (middleware is the gate, and nothing here is per-user), so without
 * this call someone who lives in /marketing and never opens /admin would still
 * be logged out 400 days after LOGIN rather than 400 days after their last
 * visit. Verification stays in middleware; this only extends.
 */
async function renewSession(): Promise<void> {
  const jar = await cookies();
  const opened = await openSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  if (opened) await touchSession(opened.sid);
}

export default async function MarketingHubLayout({ children }: { children: React.ReactNode }) {
  await renewSession();
  return (
    <div className="mk-root">
      <style>{MK_CSS}</style>
      <header className="mk-header">
        <div className="mk-brand">
          <span className="mk-brand-eyebrow">Curbio</span>
          <span className="mk-brand-name">Marketing</span>
        </div>
        <Link href="/admin" className="mk-back">
          ← Control Room
        </Link>
        <div className="mk-controls">
          {/* These two govern every screen at once — which is why they live
              in the layout and not on any page. One timeframe on screen at a
              time; YTD is an explicit choice, never an implicit second read. */}
          <HubControls months={SNAPSHOT_MONTHS} />
        </div>
      </header>
      <div className="mk-body">
        <Sidebar />
        <main className="mk-main">{children}</main>
      </div>
    </div>
  );
}
