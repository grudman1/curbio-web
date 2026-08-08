import { BROKERAGE_LOGOS } from "@/lib/partners";

// Proof band — ONE row under the hero: label left, brokerage logos right.
//
// The four stats used to sit above these logos. They moved out of the hero
// area entirely on Aug 8 and are now the navy statement band below the
// services carousel (NavyProofBand.tsx) — the numbers deserved a moment of
// their own rather than a thin white strip competing with the hero. Nothing
// else about this band changed; it is back to exactly the single row it was
// before the strip arrived.
//
// KEEPING THE LOGOS ON SCREEN AT LANDING is a standing requirement (Gavin,
// Aug 6). The hero is viewport-capped by this band's height — see the
// subtrahend in .dp-hero — so this band's height and that number move
// together. Dropping the strip shrank it back, and the subtrahend went with
// it.
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
export function ProofBand() {
  return (
    <section className="dp-proof" aria-label="Brokerages Curbio agents work with">
      <div className="dp-container dp-proof-row">
        <p className="dp-proof-label">Trusted by agents at</p>
        <div className="dp-marquee" data-animated="true">
          <div className="dp-marquee-track">
            <LogoRow />
            <LogoRow hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
