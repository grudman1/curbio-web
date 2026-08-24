// "Make the updates buyers are looking for" — the agent compilation video
// plus three staging stats. Stays adjacent to the deal section: the video is
// a five-agent compilation, so it can't be split across the router cards.
//
// Video: re-encoded from the 1080p master (Skeptical_New-Branding.mp4) —
// logo cards stripped head and tail, 2 Mbps H.264 + WebM, both under 8MB.
// preload="metadata" + poster keeps it off the LCP path.
//
// [PENDING] Captions: the <track> is wired but needs agents-on-curbio.en.vtt
// — no speech-to-text exists on this machine, so the transcript has to be
// supplied (or whisper installed) before launch. Stat sources (¹) are being
// supplied separately.

const CAPTIONS_READY = false; // flip when public/home/testimonial/agents-on-curbio.en.vtt lands

export function MoveInStats() {
  return (
    <section id="movein" className="dp-sect">
      <div className="dp-container">
        <h2 className="dp-h2" style={{ marginBottom: 20, maxWidth: "15em" }}>
          Make the updates buyers are looking for.
        </h2>
        <p className="dp-lede">
          Selling costs money either way. Curbio puts that spend where buyers can see it.
        </p>
        <div className="dps-video">
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
        <p className="dps-videocap">
          Agents in Washington DC, Los Angeles, and Baltimore on what changed once the house
          stopped being the problem.
        </p>
        <div className="dps-grid">
          <div className="dps-card">
            <p className="dps-num">94%</p>
            <p className="dps-label">
              of buyers want move-in ready<sup>1</sup>
            </p>
          </div>
          <div className="dps-card">
            <p className="dps-num">~25%</p>
            <p className="dps-label">
              more for a staged home<sup>1</sup>
            </p>
          </div>
          <div className="dps-card">
            <p className="dps-num">~73%</p>
            <p className="dps-label">
              less time on market<sup>1</sup>
            </p>
          </div>
        </div>
        <p className="dps-foot">
          <sup>1</sup> Sources being supplied separately.
        </p>
      </div>
    </section>
  );
}
