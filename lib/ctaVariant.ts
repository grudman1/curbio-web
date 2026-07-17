// ─────────────────────────────────────────────────────────────────────────────
// A/B test: CTA copy — client-safe core. One variant drives BOTH the FormCard
// submit button and the closer CTA, so a visitor always sees one consistent
// variant.
//
// Assignment is stable per visitor via the `curbio_vid` cookie set in
// middleware.ts (deterministic 50/50 by hash). The landing pages are
// prerendered (one HTML for every visitor), so the variant is bucketed
// CLIENT-side from the cookie — see PageShell. The server-side flag in
// lib/flags.ts wraps the same bucket() for routes that still render
// per-request (/exp).
//
// IMPORTANT: prerendered HTML carries the control copy until hydration. Both
// variants currently share identical copy, so nothing flashes. If the copy
// ever diverges, move the split to a variant-suffixed middleware rewrite so
// each variant is its own prerendered page.
// ─────────────────────────────────────────────────────────────────────────────

export type CtaVariant = "control" | "treatment";

export const CTA_COPY: Record<CtaVariant, string> = {
  control: "Get your free estimate",
  treatment: "Get your free estimate",
};

// Small, stable string hash (djb2) → used to bucket a visitor id 50/50.
// Must stay in lockstep with any server-side bucketing (lib/flags.ts) —
// the same visitor id must always land in the same bucket.
export function bucket(id: string): CtaVariant {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2 === 0 ? "control" : "treatment") as CtaVariant;
}

/** Bucket the current visitor from the `curbio_vid` cookie. Browser-only —
 *  returns "control" on the server or when the cookie is missing. */
export function readVariantFromCookie(): CtaVariant {
  if (typeof document === "undefined") return "control";
  const m = document.cookie.match(/(?:^|;\s*)curbio_vid=([^;]+)/);
  return m ? bucket(decodeURIComponent(m[1])) : "control";
}
