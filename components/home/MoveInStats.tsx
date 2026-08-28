// The agent compilation video — now a caption-only block sitting directly
// under the capacity calculator.
//
// WHAT WENT AND WHY. This used to be a full section headed "Make the updates
// buyers are looking for," with the lede "Selling costs money either way."
// Both are gone: that is a WHY-PREP argument aimed at a seller, and this page
// argues why CURBIO to an agent who already preps their listings. The clip
// itself survives because it is agents in their own words, which is proof
// rather than argument — so it keeps only its caption and follows the
// calculator, where "what changed once the house stopped being the problem"
// is the answer to the number the calculator just put on screen.
//
// The three staging figures that used to sit under the caption moved to
// /how-it-works (components/sections/StatBand) — seller-facing evidence
// belongs on the seller-facing page.
//
// Video: re-encoded from the 1080p master (Skeptical_New-Branding.mp4) —
// logo cards stripped head and tail, 2 Mbps H.264 + WebM, both under 8MB.
// preload="metadata" + poster keeps it off the LCP path.
//
// [PENDING] Captions: the <track> is wired but needs agents-on-curbio.en.vtt
// — no speech-to-text exists on this machine, so the transcript has to be
// supplied (or whisper installed) before launch.

const CAPTIONS_READY = false; // flip when public/home/testimonial/agents-on-curbio.en.vtt lands

export function MoveInStats() {
  return (
    <section id="agents-on-curbio" className="c-sect c-sect--tight-top">
      <div className="c-container">
        <div className="cs-video">
          <video
            controls
            playsInline
            preload="metadata"
            poster="/home/testimonial/agents-on-curbio-poster.jpg"
            aria-label="Agents on working with Curbio"
          >
            <source src="/home/testimonial/agents-on-curbio.webm" type="video/webm" />
            <source src="/home/testimonial/agents-on-curbio.mp4" type="video/mp4" />
            {CAPTIONS_READY && (
              <track kind="captions" src="/home/testimonial/agents-on-curbio.en.vtt" srcLang="en" label="English" default />
            )}
          </video>
        </div>
        <p className="cs-videocap">
          Agents in Washington DC, Los Angeles, and Baltimore on what changed once the house
          stopped being the problem.
        </p>
      </div>
    </section>
  );
}
