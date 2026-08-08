import { Fragment } from "react";
import { BROKERAGE_LOGOS } from "@/lib/partners";

// Proof band — two rows: the trust strip, then the brokerage logo marquee.
//
// The stats row was dropped Aug 6 because two of its four figures were
// unsourced placeholders ([rating] from [count] agent reviews). It is BACK
// as of Aug 7 with real, final numbers — and the review figure it used to
// carry now lives in the hero eyebrow instead, so nothing is said twice.
//
// This is the original row restored, not a new component: the markup and the
// .dp-proof-stat* rules are the ones from 4223269. The only deliberate change
// is alignment — the row is left-aligned to sit with the "Trusted by agents
// at" rail below it, where v1 centred it against a centred label.
//
// Reads as one credibility zone with the hero: review line -> trust strip ->
// logos. Trust signals, not a CTA — navy on muted, thin dividers, no amber
// anywhere ("if everything is amber, nothing is").
//
// KEEPING THE LOGOS ON SCREEN AT LANDING is a standing requirement (Gavin,
// Aug 6). The hero is viewport-capped by this band's height — see the
// subtrahend in .dp-hero — so growing this band means growing that number.
// It was re-tuned with this row; if you add to this band, re-tune it again.
//
// Placeholders still live elsewhere: AwardsStrip carries five
// ([Award] ×2, [rating], [count], [press]).
//
// Logos: each declared once in CSS custom properties (see .dp-logo) — never
// repeated <img> tags; the duplicate loop track is aria-hidden.

function LogoRow({ hidden }: { hidden?: boolean }) {
  return (
    <>
      {BROKERAGE_LOGOS.map((b) => (
        <span
          key={b.id}
          className="dp-logo"
          role={hidden ? undefined : "img"}
          aria-label={hidden ? undefined : b.name}
          aria-hidden={hidden || undefined}
          style={
            {
              aspectRatio: b.aspectRatio,
              "--logo-mono": `url(${b.logoPath})`,
              "--logo-color": `url(${b.logoPathColor})`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

// All four are real and final. The review figure deliberately is NOT here —
// it is the hero eyebrow, and repeating it would spend the same proof twice.
const STATS: React.ReactNode[] = [
  <>
    <b>8,000+</b> homes prepped
  </>,
  <>
    <b>$0</b> until closing
  </>,
  <>
    <b>1-year</b> warranty
  </>,
  <>Licensed &amp; insured</>,
];

export function ProofBand() {
  return (
    <section className="dp-proof" aria-label="Why agents trust Curbio">
      <div className="dp-container">
        {/* The dividers are SIBLINGS of the stats, not children of them. That
            is what lets justify-content:space-between spread all seven items
            across the full container width — with the divider nested inside
            each stat it travelled with the text and the row stayed clustered
            at the left margin. */}
        <p className="dp-proof-stats">
          {STATS.map((s, i) => (
            <Fragment key={i}>
              <span className="dp-proof-stat">{s}</span>
              {i < STATS.length - 1 && (
                <span className="dp-proof-sep" aria-hidden="true">
                  &middot;
                </span>
              )}
            </Fragment>
          ))}
        </p>
        <div className="dp-proof-row">
          <p className="dp-proof-label">Trusted by agents at</p>
          <div className="dp-marquee" data-animated="true">
            <div className="dp-marquee-track">
              <LogoRow />
              <LogoRow hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
