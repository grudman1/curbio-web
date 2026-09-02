// The site estimate flow mounts the established confirmation implementation
// verbatim. This preserves the single-post receipt, cookie-prefilled calendar,
// and in-place “I'll wait” state rather than creating a second confirmation
// path that can drift back into duplicate lead submission.
export { default, metadata } from "@/app/(campaigns)/lp/[campaign]/confirm/page";
