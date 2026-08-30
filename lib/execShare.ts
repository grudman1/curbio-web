// ─────────────────────────────────────────────────────────────────────────────
// The executive share token — ONE env-configured string that lets a link
// holder view the read-only exec review at /admin/executive/<token> without an
// admin session. Read in exactly two places (the edge bypass in middleware.ts
// and the page's own re-validation), through this helper so the two can never
// disagree about which env var is live.
//
// ── The env var is mid-rename ───────────────────────────────────────────────
// The route moved from /marketing/executive/<token> when the /marketing tree
// was consolidated into /admin (2026-08). EXEC_SHARE_TOKEN is the current
// name; MARKETING_EXEC_SHARE_TOKEN is honored as a fallback so the rename
// needs no coordinated deploy — Vercel can gain the new var and lose the old
// one whenever convenient, in either order, without a dead link in between.
// Once Vercel carries only EXEC_SHARE_TOKEN, the fallback can be deleted.
//
// Edge-safe: reads env only, no Node APIs.
// ─────────────────────────────────────────────────────────────────────────────

/** The active share token, or undefined when none is configured — in which
 *  case no bypass exists at all and the route 404s (fails closed). */
export function execShareToken(): string | undefined {
  return process.env.EXEC_SHARE_TOKEN || process.env.MARKETING_EXEC_SHARE_TOKEN || undefined;
}
