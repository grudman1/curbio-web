// A first name for greeting copy — ONLY for that. lib/adminAuth.ts's
// AdminUser carries no display name (just email + role), and there is no
// account-record field to add one to without a schema change, so the roster
// is a closed lookup here instead — the same shape as config/adminAccess.ts's
// OWNER_EMAILS, one small hardcoded list rather than a database field for
// five people. Gavin confirmed these are the only accounts that will exist:
// Rich, Aaron, Rick, Gavin, Becca.
//
// Kept separate from AppShell.tsx's accountChipFrom (initials + full email for
// the header chip): that one is an identity display and should show the real
// address; this one is copy for a headline and only ever wants a first name.
const KNOWN_FIRST_NAMES: Record<string, string> = {
  rpiette: "Rich",
  aglines: "Aaron",
  rrudman: "Rick",
  grudman: "Gavin",
  blevine: "Becca",
};

/**
 * The fallback below (capitalize the email's local-part) is a safety net for
 * an account created before this list is updated — not an expected path.
 * Add the new local-part here rather than letting the fallback carry it.
 */
export function firstNameFrom(email: string): string {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  const known = KNOWN_FIRST_NAMES[local];
  if (known) return known;
  const first = local.split(/[._+-]/).find(Boolean) ?? local;
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
