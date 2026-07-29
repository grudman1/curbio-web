// ─────────────────────────────────────────────────────────────────────────────
// Admin account policy. Data, not secrets — an email address and a domain are
// not credentials, so this belongs in version control, not an env var.
//
// OWNER_EMAILS auto-approves as `owner` on first signup. Everyone else with
// an @curbio.com address who signs up lands in `pending` until an owner
// approves them from the Control Room. There is no self-service path onto
// this list — adding a second owner is a PR, which is the right amount of
// friction for "who can approve other people's access."
// ─────────────────────────────────────────────────────────────────────────────

export const OWNER_EMAILS = ["grudman@curbio.com"];

export const ALLOWED_EMAIL_DOMAIN = "curbio.com";

export function isAllowedDomain(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export function isOwnerEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return OWNER_EMAILS.some((o) => o.toLowerCase() === e);
}
