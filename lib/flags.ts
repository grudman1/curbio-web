import { flag } from "flags/next";
import { bucket, type CtaVariant } from "./ctaVariant";

// Server-side wrapper for the cta-copy A/B test. The bucketing core (hash,
// copy table) lives in lib/ctaVariant.ts so prerendered pages can compute the
// same variant client-side from the `curbio_vid` cookie — see that file.
// This flag remains for routes that still render per-request (/exp).
//
// NOTE: a single email send won't reach statistical significance. Let this run
// across multiple sends and read results in Vercel Web Analytics, filtering the
// `lead_submit` custom event by its `variant` property.

export type { CtaVariant } from "./ctaVariant";
export { CTA_COPY } from "./ctaVariant";

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
