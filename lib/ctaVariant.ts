// ─────────────────────────────────────────────────────────────────────────────
// A/B testing — assignment, bucketing, and the one active experiment.
//
// ASSIGNMENT IS THE ONE THING THAT MUST NEVER CHANGE. A visitor gets a random
// `curbio_vid` cookie from middleware.ts on first request (1-year, lax), and
// bucket() hashes it to a variant. Same id → same bucket, forever, on every
// layer that reads it. Changing the cookie name, the hash, or the modulus
// re-buckets everyone mid-flight and invalidates whatever is running.
//
// ── THE TWO DELIVERY PATHS — pick by what the experiment changes ────────────
//
// There are two ways a variant reaches the visitor. They share this file's
// bucket() so one visitor is in one bucket whichever layer reads it. What
// differs is WHERE the swap happens, and therefore whether it can flash.
//
//   CLIENT PATH  (surface: "client")  — the default, no infrastructure.
//     Components read readVariantFromCookie() in an effect and swap after
//     hydration. The prerendered HTML carries CONTROL until then.
//     Use for: button labels, below-the-fold copy, anything a visitor will
//     not notice changing a beat after paint.
//     Cost: a real flash-of-wrong-variant on anything visible at first paint.
//     Wired in: CampaignShell (falls back to this when no variant is passed).
//
//   EDGE PATH  (surface: "edge")  — no flash, costs prerendered pages.
//     Middleware buckets the SAME cookie and rewrites to a variant-specific
//     prerendered route (/lp/<campaign>/v/<variant>[/m/<market>]), so the HTML
//     that leaves the CDN is already the right variant. The visitor's URL is
//     unchanged. The page passes the variant to CampaignShell as a prop, which
//     disables the client swap entirely — nothing to flash.
//     Use for: headlines, hero layout, section order, anything above the fold
//     or structural.
//     Cost: variants × markets prerendered pages, and the route must exist.
//
// Setting ACTIVE_EXPERIMENT.surface is what switches paths. Nothing else has
// to change — middleware only rewrites when surface is "edge".
//
// ── ADDING AN EXPERIMENT ────────────────────────────────────────────────────
// Edit ACTIVE_EXPERIMENT below: new key, new startedAt, new copy, and the
// surface the change needs. One experiment at a time on purpose — there is no
// registry, because two overlapping tests on one bucketing cookie is not a
// thing this codebase can currently analyse honestly.
//
// Results: /admin/experiments reads the variant recorded on every stored lead.
// ─────────────────────────────────────────────────────────────────────────────

export type CtaVariant = "control" | "treatment";

/** Every bucket, in display order. Iterate this rather than hardcoding pairs. */
export const VARIANTS: readonly CtaVariant[] = ["control", "treatment"] as const;

export const CTA_COPY: Record<CtaVariant, string> = {
  control: "Get your free estimate",
  treatment: "Get your free estimate",
};

/** Which layer delivers the variant. See "THE TWO DELIVERY PATHS" above. */
export type ExperimentSurface = "client" | "edge";

/**
 * THE ONE ACTIVE EXPERIMENT.
 *
 * `startedAt` is not decoration: /admin/experiments filters leads to on-or-
 * after this date, so results never silently include leads from before the
 * test existed. It is an ISO date (UTC).
 *
 * cta-copy has been assigning visitors since lib/ctaVariant.ts landed
 * (2026-07-11) and has NEVER varied — both arms carry identical copy, so the
 * dev warning below fires and the results view reports no variance. That is
 * the intended state until someone actually changes `treatment`.
 */
export const ACTIVE_EXPERIMENT = {
  key: "cta-copy",
  startedAt: "2026-07-11",
  surface: "client" as ExperimentSurface,
  /** What each bucket actually gets. Identical values = no test is running. */
  copy: CTA_COPY,
} as const;

/** Do the variants actually differ? False means nothing is being tested. */
export function hasVariance(copy: Record<CtaVariant, string> = CTA_COPY): boolean {
  const values = VARIANTS.map((v) => copy[v]);
  return new Set(values).size > 1;
}

// ── Guardrail: a test that isn't testing anything ───────────────────────────
// The failure mode this catches is the quiet one — the plumbing works, events
// carry a variant, the results view fills with numbers, and both arms were
// serving the same thing the whole time. Dev/preview only: never noise in a
// production log, and never throws (a no-variance experiment is a valid
// resting state, not a broken build).
if (process.env.NODE_ENV !== "production" && !hasVariance()) {
  console.warn(
    `[experiment] "${ACTIVE_EXPERIMENT.key}" has no variance — no test is running. ` +
      `All ${VARIANTS.length} variants resolve to the same copy, so any split in the ` +
      `results is noise. Give a variant different copy in lib/ctaVariant.ts, or ignore ` +
      `this if the experiment is intentionally parked.`
  );
}

// Small, stable string hash (djb2) → used to bucket a visitor id 50/50.
// The same visitor id must always land in the same bucket — never change
// this hash while the experiment is running.
export function bucket(id: string): CtaVariant {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2 === 0 ? "control" : "treatment") as CtaVariant;
}

/** Is this string one of the known variants? Used to validate the `v/<variant>`
 *  route segment before it is trusted as a bucket. */
export function isVariant(value: string | null | undefined): value is CtaVariant {
  return !!value && (VARIANTS as readonly string[]).includes(value);
}

/** Bucket the current visitor from the `curbio_vid` cookie. Browser-only —
 *  returns "control" on the server or when the cookie is missing. */
export function readVariantFromCookie(): CtaVariant {
  if (typeof document === "undefined") return "control";
  const m = document.cookie.match(/(?:^|;\s*)curbio_vid=([^;]+)/);
  return m ? bucket(decodeURIComponent(m[1])) : "control";
}
