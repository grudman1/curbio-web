// "Make the updates buyers are looking for" — the agent compilation video.
// Stays adjacent to the deal section: the video is a five-agent compilation,
// so it can't be split across the router cards.
//
// The three staging stats that used to sit under this caption are their own
// section now (components/sections/StatBand, mounted next on the homepage) —
// under the clip they read as a footnote to it rather than as the argument
// they are. Their sourcing footnote went with them.
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
    <section id="movein" className="c-sect">
      <div className="c-container">
        <h2 className="c-h2" style={{ marginBottom: 20, maxWidth: "15em" }}>
          Make the updates buyers are looking for.
        </h2>
        <p className="c-lede">
          Selling costs money either way. Curbio puts that spend where buyers can see it.
        </p>
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
