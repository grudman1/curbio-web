import { flag } from "flags/next";

// ─────────────────────────────────────────────────────────────────────────────
// A/B test: CTA copy. One flag drives BOTH the FormCard submit button and the
// sticky-bar pill, so a visitor always sees one consistent variant.
//
//   control   → "See how we'd prep your listing"   (third person, our voice)
//   treatment → "Show me how you'd prep my listing" (first person hypothesis)
//
// Assignment is stable per visitor via the `curbio_vid` cookie set in
// middleware.ts (deterministic 50/50 by hash). Read server-side in app/page.tsx
// via `ctaCopyFlag()`, then passed down — never evaluated twice in one render.
//
// NOTE: a single email send won't reach statistical significance. Let this run
// across multiple sends and read results in Vercel Web Analytics, filtering the
// `lead_submit` custom event by its `variant` property.
// ─────────────────────────────────────────────────────────────────────────────

export type CtaVariant = "control" | "treatment";

export const CTA_COPY: Record<CtaVariant, string> = {
  control: "Get your free estimate",
  treatment: "Get your free estimate",
};

// Small, stable string hash (djb2) → used to bucket a visitor id 50/50.
function bucket(id: string): CtaVariant {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2 === 0 ? "control" : "treatment") as CtaVariant;
}

export const ctaCopyFlag = flag<CtaVariant>({
  key: "cta-copy",
  defaultValue: "control",
  // `decide` runs server-side per request. If a Vercel Flags provider is wired
  // (vercelAdapter via the Flags dashboard / Edge Config), it overrides this;
  // otherwise we bucket deterministically on the visitor cookie.
  decide({ cookies }) {
    const vid = cookies.get("curbio_vid")?.value;
    return vid ? bucket(vid) : "control";
  },
});
