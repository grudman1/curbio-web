// The dashboard owns this screen — see
// app/(site)/admin/(dashboard)/attribution/page.tsx. /marketing renders the
// same surface for the same internal audience, so it re-exports rather than
// keeping a second copy that would drift.
export { default, metadata } from "@/app/(site)/admin/(dashboard)/attribution/page";
