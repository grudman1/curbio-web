// ─────────────────────────────────────────────────────────────────────────────
// Optional hero visual — a NAMED illustration a campaign config can turn on
// with `hero.visual`. Drawn in code from the site's own tokens: no image
// files, no external assets, no colours outside globals.css.
//
// Off by default and absent from the markup when unset, so every page that
// does not opt in renders byte-for-byte as before (the DOM diff holds).
// Decorative only: the caller wraps it in `aria-hidden`.
//
// The prerendered skeleton (PageSkeleton) renders this inside a server
// component, so the file itself stays server-safe; its one client piece is
// PlayWhenSeen, which only decides WHEN the entrance plays. The motion is CSS
// (app/globals.css, `.lp-cc*`), and every animated element's un-animated style
// IS its resting state, so `prefers-reduced-motion` simply switches the
// animations off and leaves a finished still.
// ─────────────────────────────────────────────────────────────────────────────

import { PlayWhenSeen } from "./PlayWhenSeen";

/** The visuals that exist. A config names one; it cannot supply markup. */
export type HeroVisualName = "coffee-card";

/**
 * `still`: render the visual's box but keep it invisible. The skeleton uses
 * this so the layout is identical before and after the market resolves, while
 * the entrance animation plays once, on the resolved page — the skeleton and
 * the page are different trees, so a visible skeleton copy would restart the
 * animation mid-flight on resolve.
 */
export function HeroVisual({ visual, still = false }: { visual?: HeroVisualName; still?: boolean }) {
  if (visual === "coffee-card") return <CoffeeCard still={still} />;
  return null;
}

/**
 * The team-lead coffee card (config/campaigns/coffee.ts), drawn to match the
 * final mailed card. It is dealt onto the table back-first — the back as
 * mailed: wordmark, "The listing prep manager for top agents and teams.",
 * curbio.com/coffee and the phone number — then flips to the front: "There's
 * no such thing as a free lunch." over "But there is" and the amber "free
 * coffee.", the amber rule, the wordmark at the foot. It settles into a slow
 * float; a takeaway cup slides in beside it with rising steam; the amber
 * "free coffee." catches a foil glint every few seconds. No brand on the cup,
 * and none of the gift card that was inside.
 */
function CoffeeCard({ still }: { still: boolean }) {
  return (
    <Frame still={still}>
      <div className="lp-cc-stage">
        {/* backdrop: warm disc + a slow dashed orbit */}
        <svg className="lp-cc-back-svg" viewBox="0 0 460 240" aria-hidden="true">
          <circle className="lp-cc-blob" cx="262" cy="122" r="104" />
          <circle className="lp-cc-orbit" cx="262" cy="122" r="116" />
        </svg>

        <span className="lp-cc-shadow lp-cc-shadow--card" />
        <div className="lp-cc-card">
          <div className="lp-cc-flip">
            <div className="lp-cc-face lp-cc-front">
              <div className="lp-cc-kicker">There’s no such thing as a free lunch.</div>
              <div className="lp-cc-text">
                But there is
                <br />
                <em>free coffee.</em>
              </div>
              <span className="lp-cc-rule" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="lp-cc-logo" src="/logo/curbio-navy.svg" alt="" width={66} height={17} />
            </div>
            <div className="lp-cc-face lp-cc-back">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="lp-cc-back-logo" src="/logo/curbio-navy.svg" alt="" width={56} height={14} />
              <div className="lp-cc-back-h">
                The listing prep manager
                <br />
                for <em>top agents</em> and teams.
              </div>
              <span className="lp-cc-back-rule" />
              <span className="lp-cc-back-url">curbio.com/coffee · (844) 944-2629</span>
            </div>
          </div>
        </div>

        <span className="lp-cc-shadow lp-cc-shadow--cup" />
        <svg className="lp-cc-cup" viewBox="0 0 96 128" aria-hidden="true">
          {/* steam */}
          <path className="lp-cc-steam" d="M38 22c-3-4 3-6 0-10s3-6 0-10" />
          <path className="lp-cc-steam" d="M48 20c-3-4 3-6 0-10s3-6 0-10" />
          <path className="lp-cc-steam" d="M58 22c-3-4 3-6 0-10s3-6 0-10" />
          {/* body, with the shaded far side */}
          <path d="M22 41h52l-7 81q-.5 4-5 4H34q-4.5 0-5-4z" fill="var(--white)" />
          <path d="M60 41h14l-7 81q-.5 4-5 4h-4z" fill="var(--navy-08)" />
          {/* sleeve */}
          <path d="M23 63h50l-3.2 38H26.2z" fill="var(--amber)" />
          <path d="M63 63h10l-3.2 38H61z" fill="var(--amber-110)" />
          <path d="M28 66.5h4l-1.2 31H27.5z" fill="var(--amber-30)" opacity=".7" />
          <path d="M23 63h50l-3.2 38H26.2z" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" />
          {/* body outline on top */}
          <path d="M22 41h52l-7 81q-.5 4-5 4H34q-4.5 0-5-4z" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinejoin="round" />
          {/* lid */}
          <path d="M26 33.5Q27 26 48 26t22 7.5z" fill="var(--navy)" />
          <rect x="18" y="33" width="60" height="9" rx="4.5" fill="var(--navy)" />
          <rect x="22" y="35.5" width="20" height="2" rx="1" fill="var(--navy-85)" />
          <ellipse cx="58" cy="29.6" rx="4.2" ry="1.4" fill="var(--navy-30)" />
        </svg>

        {/* foreground: beans + sparkles */}
        <svg className="lp-cc-deco" viewBox="0 0 460 240" aria-hidden="true">
          <g transform="translate(378 206) rotate(28)">
            <g className="lp-cc-bean">
              <ellipse rx="9" ry="6.2" fill="var(--navy-85)" />
              <path d="M-7 1.2C-3-3 3 3.2 7-1" fill="none" stroke="var(--cloud-white)" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(402 222) rotate(-24)">
            <g className="lp-cc-bean lp-cc-bean--2">
              <ellipse rx="8" ry="5.5" fill="var(--navy)" />
              <path d="M-6 1C-2.6-2.6 2.6 2.8 6-.8" fill="none" stroke="var(--cloud-white)" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(318 34)">
            <path className="lp-cc-spark" d="M0-11C1-2.5 2.5-1 11 0 2.5 1 1 2.5 0 11-1 2.5-2.5 1-11 0-2.5-1-1-2.5 0-11z" />
          </g>
          <g transform="translate(356 74) scale(.55)">
            <path className="lp-cc-spark lp-cc-spark--2" d="M0-11C1-2.5 2.5-1 11 0 2.5 1 1 2.5 0 11-1 2.5-2.5 1-11 0-2.5-1-1-2.5 0-11z" />
          </g>
          <g transform="translate(420 150) scale(.6)">
            <path className="lp-cc-spark lp-cc-spark--3" d="M0-11C1-2.5 2.5-1 11 0 2.5 1 1 2.5 0 11-1 2.5-2.5 1-11 0-2.5-1-1-2.5 0-11z" />
          </g>
        </svg>
      </div>
    </Frame>
  );
}

/** The skeleton's invisible copy needs no play logic; the real one does. */
function Frame({ still, children }: { still: boolean; children: React.ReactNode }) {
  if (still) return <div className="lp-cc" style={{ visibility: "hidden" }}>{children}</div>;
  return <PlayWhenSeen className="lp-cc">{children}</PlayWhenSeen>;
}
