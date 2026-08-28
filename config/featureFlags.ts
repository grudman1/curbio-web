// ─────────────────────────────────────────────────────────────────────────────
// Build-time feature flags for the marketing site.
//
// Deliberately plain constants, not a runtime service: every flag here gates
// MARKUP, so a constant lets dead branches fall out of the bundle instead of
// shipping both arms to every visitor. A flag that needs to vary per visitor
// (a real A/B split) graduates to lib/ctaVariant.ts's cookie mechanism —
// that is the difference between "not built yet" and "being measured".
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "How did you hear about us?" as step two of the hero form.
 *
 * OFF by default and shipping off. It exists as a wired, reviewable arm so
 * turning the experiment on is a one-line change rather than a build — but
 * an extra field between an agent and their estimate is a conversion cost,
 * and it is not paid until someone decides the attribution is worth it.
 *
 * Attribution today comes from UTMs + first-touch, which cost the visitor
 * nothing; this question is only worth asking for the traffic those miss.
 */
export const HERO_ATTRIBUTION_QUESTION = false;

/** Options for the flagged question above. Ordered by expected frequency, with
 *  the escape hatch last — nobody should have to read the list to leave. */
export const HERO_ATTRIBUTION_OPTIONS = [
  "A colleague or another agent",
  "My brokerage",
  "A Curbio manager I've met",
  "Search",
  "Social media",
  "Email from Curbio",
  "Something else",
] as const;
