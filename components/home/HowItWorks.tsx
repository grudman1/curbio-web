import Image from "next/image";

// How it works — animated section title over three steps.
//
// ── The rotating headline ────────────────────────────────────────────────────
// Navy "Curbio helps you" + an amber phrase that cycles vertically, modeled on
// Opendoor's hero. Deliberately CSS-only, no JS:
//
//   • phrase 1 ("win the listing") is the FIRST PAINTED FRAME by construction —
//     it's the first node in the track and the animation starts at translateY(0).
//     A slow load, a JS failure, or reduced-motion all land on the strongest
//     phrase rather than a blank box or a mid-cycle one.
//   • the loop is seamless because phrase 1 is CLONED at the end of the track
//     (data-loop-clone). The animation runs to the clone and resets to 0 —
//     identical pixels, so the reset is invisible.
//
// ── Accessibility ───────────────────────────────────────────────────────────
// A screen reader gets ONE complete sentence from the sr-only span; the
// animated track is aria-hidden, so the rotating fragments are never announced
// as five disconnected phrases. Under prefers-reduced-motion the animation is
// off entirely and only phrase 1 shows (see home.css).

const PHRASES = [
  "win the listing",
  "prep the house",
  "list on time",
  "impress the seller",
  "close with confidence",
];

// The sentence a screen reader actually hears. Kept adjacent to PHRASES so the
// two cannot drift apart.
const SPOKEN = `Curbio helps you ${PHRASES.slice(0, -1).join(", ")}, and ${
  PHRASES[PHRASES.length - 1]
}.`;

const STEPS = [
  {
    num: "01",
    title: "You win the listing",
    line: "Your edge in the listing presentation: a licensed GC, market-ready prep, pay at close.",
    src: "/home/how/01-win-the-listing.jpg",
    alt: "An agent showing sellers a Curbio plan on a tablet in their kitchen",
  },
  {
    num: "02",
    title: "We do the work",
    line: "One project manager, crews moving at the pace of real estate — track every step in the app.",
    // Frame at 0:25 of the Aaron Glines PM Spotlight cut (1080p, 19 Mbps).
    // Replaces the still that shipped in #33: same shot, but that still was
    // 2560x1387 and MEASURED 32% softer through the card's crop-and-resize —
    // more pixels, less real detail, i.e. an upscale of lower-res source.
    //
    // RE-EXTRACTED Aug 7 (Gavin: "still blurry") — 1.82x sharper measured
    // through the real delivery pipeline, same frame. Two causes, neither of
    // them the frame's resolution:
    //
    //   1. ASPECT. The card is 4:3 and the frame was 16:9, so object-fit
    //      cover had to scale the bitmap to 494 CSS px to fill a 371px box.
    //      At dpr 2 that needs 988px, but `sizes="30vw"` describes the
    //      ELEMENT (371px), so next/image served 828 — a 19% UPSCALE of an
    //      already-soft still. Cropping to 4:3 (1440x1080) at extraction
    //      makes the served 828 an over-supply instead. Worth 1.21x alone.
    //   2. It is a video frame — shallow depth of field, subject mid-motion.
    //      A light unsharp (0.75) recovers what the codec smeared: 1.82x
    //      total. Checked at display size for halos at 0.6/0.75/0.9.
    //
    // Do NOT swap this for a "sharper" frame without watching the clip: 25.0s
    // sits in a soft valley (measured 119 vs 307 at 23.7s), but 23.7s is a
    // DIFFERENT shot — there is a cut at ~24.8s — and the sharpest frames
    // inside this shot (28.4-29.0s) have an out-of-focus foreground mass
    // covering half the frame. 25.0s is the best usable frame of this shot.
    src: "/home/how/02-we-do-the-work.jpg",
    alt: "Curbio crews replacing a window on a home exterior",
  },
  {
    num: "03",
    title: "Seller pays at close",
    line: "Nothing upfront; the project settles as one line when the home sells.",
    src: "/home/how/03-pay-at-close.jpg",
    alt: "Sellers holding a SOLD sign with their agent in the kitchen",
  },
];

export function HowItWorks() {
  return (
    <section className="dp-sect dp-sect--tight-top" id="how-it-works">
      <div className="dp-container">
        <h2 className="dp-h2 dp-rot-h2">
          <span className="dp-sr-only">{SPOKEN}</span>
          <span className="dp-rot" aria-hidden="true">
            <span className="dp-rot-static">Curbio helps you</span>{" "}
            <span className="dp-rot-mask">
              <span className="dp-rot-track">
                {PHRASES.map((p) => (
                  <span key={p} className="dp-rot-item">
                    {p}
                  </span>
                ))}
                {/* Clone of phrase 1 — the animation ends here and snaps back
                    to the real phrase 1, which is pixel-identical. */}
                <span className="dp-rot-item" data-loop-clone="true">
                  {PHRASES[0]}
                </span>
              </span>
            </span>
          </span>
        </h2>

        <div className="dp-how-grid">
          {STEPS.map((s) => (
            <div key={s.num} className="dp-how-step">
              <div className="dp-how-img">
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  sizes="(max-width: 640px) 90vw, 30vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <p className="dp-how-num">{s.num}</p>
              <h3 className="dp-how-title">{s.title}</h3>
              <p className="dp-how-line">{s.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
