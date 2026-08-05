// "Make the updates buyers are looking for" — testimonial video plus three
// staging stats. The video is a real file under public/ (1.9MB MP4):
// preload="metadata" so nothing but the header loads until the visitor
// presses play, a real poster frame, and no autoplay — the design file's
// exact behavior.

export function MoveInStats() {
  return (
    <section id="movein" className="dp-sect dp-sect--sunken">
      <div className="dp-container">
        <h2 className="dp-h2" style={{ marginBottom: 20, maxWidth: "15em" }}>
          Make the updates buyers are looking for.
        </h2>
        <p className="dp-lede">
          Selling a home costs money either way — in price cuts, in repair credits, in months of
          carrying costs. Curbio puts that spend where buyers can see it, and the seller settles
          up at closing.
        </p>
        <div className="dps-video">
          <video
            controls
            playsInline
            preload="metadata"
            poster="/home/testimonial/agents-on-curbio-poster.jpg"
            aria-label="Agents on working with Curbio"
          >
            <source src="/home/testimonial/agents-on-curbio.mp4" type="video/mp4" />
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
              of buyers want a home that is move-in ready<sup>1</sup>
            </p>
          </div>
          <div className="dps-card">
            <p className="dps-num">~25%</p>
            <p className="dps-label">
              more is what a staged home can sell for<sup>1</sup>
            </p>
          </div>
          <div className="dps-card">
            <p className="dps-num">~73%</p>
            <p className="dps-label">
              less time on market for a staged home<sup>1</sup>
            </p>
          </div>
        </div>
        <p className="dps-foot">
          <sup>1</sup> Source needed before this ships — these three figures came across from a
          reference layout and are not yet attributed to a Curbio-verifiable study.
        </p>
      </div>
    </section>
  );
}
