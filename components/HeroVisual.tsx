// ─────────────────────────────────────────────────────────────────────────────
// Optional hero visual — a NAMED illustration a campaign config can turn on
// with `hero.visual`. Drawn in code from the site's own tokens: no image
// files, no external assets, no colours outside globals.css.
//
// Off by default and absent from the markup when unset, so every page that
// does not opt in renders byte-for-byte as before (the DOM diff holds).
// Decorative only: the caller wraps it in `aria-hidden`.
//
// Like HeroCopyBody, this file has no client-only imports, because the
// prerendered skeleton (PageSkeleton) renders it inside a server component so
// the first paint already carries the visual and nothing moves on resolve.
// ─────────────────────────────────────────────────────────────────────────────

/** The visuals that exist. A config names one; it cannot supply markup. */
export type HeroVisualName = "coffee-card";

export function HeroVisual({ visual }: { visual?: HeroVisualName }) {
  if (visual === "coffee-card") return <CoffeeCard />;
  return null;
}

/**
 * The team-lead coffee card (config/campaigns/coffee.ts), so a team lead who
 * lands here recognises the thing that arrived in the mail: a white landscape
 * card, slightly tilted, "Coffee's on us." in the hero's serif with the amber
 * "on us." and rule, the small navy wordmark at the foot; a plain coffee cup
 * beside it in navy and amber. No brand on the cup.
 */
function CoffeeCard() {
  return (
    <div className="lp-cc">
      <div className="lp-cc-card">
        <div className="lp-cc-text">
          Coffee’s <em>on us.</em>
        </div>
        <span className="lp-cc-rule" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lp-cc-logo" src="/logo/curbio-navy.svg" alt="" width={68} height={18} />
      </div>
      <svg className="lp-cc-cup" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        {/* steam */}
        <g stroke="var(--navy-30)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
          <path d="M44 34c-4-6 4-10 0-16" />
          <path d="M58 30c-4-7 4-11 0-18" />
          <path d="M72 34c-4-6 4-10 0-16" />
        </g>
        {/* saucer */}
        <ellipse cx="58" cy="100" rx="40" ry="8" fill="var(--white)" stroke="var(--navy)" strokeWidth="3" />
        {/* cup */}
        <path
          d="M24 48h68v18c0 20-13 34-34 34S24 86 24 66V48z"
          fill="var(--white)"
          stroke="var(--navy)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* amber band */}
        <path d="M26.5 58h63a40 40 0 0 1-2.2 10H28.7a40 40 0 0 1-2.2-10z" fill="var(--amber)" />
        {/* handle */}
        <path d="M92 56h6a11 11 0 0 1 0 22h-8" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" />
        {/* rim */}
        <path d="M24 48h68" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
