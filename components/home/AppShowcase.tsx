// The app — a screen recording of an estimate being built, not a static
// mockup. It was on the old site and it's a real differentiator.
//
// [PLACEHOLDER — APPROVED] No screen recording of the estimate flow exists in
// any asset library on this machine, and recording one needs an app login.
// Rendering with a marked placeholder was an explicit call (Gavin, Aug 5) —
// drop the recording at public/home/app/estimate-walkthrough.{mp4,webm} and
// swap the placeholder for the <video> block below.

export function AppShowcase() {
  return (
    <section className="c-sect" id="app">
      <div className="c-container c-app-grid">
        <div>
          <p className="c-eyebrow">The Curbio app</p>
          <h2 className="c-h2" style={{ marginBottom: 18, maxWidth: "12em" }}>
            An estimate in the time a walkthrough takes.
          </h2>
          <p className="c-lede" style={{ fontSize: 17.5 }}>
            Photos in, line-item estimate out — from your phone.
          </p>
        </div>
        <div className="c-app-media">
          {/* When the recording lands:
              <video autoPlay muted playsInline loop poster="/home/app/estimate-poster.jpg">
                <source src="/home/app/estimate-walkthrough.webm" type="video/webm" />
                <source src="/home/app/estimate-walkthrough.mp4" type="video/mp4" />
              </video> */}
          <p className="c-app-placeholder">
            [Placeholder — approved]
            <br />
            Screen recording: building an estimate
            <br />
            awaiting capture from app.curbio.com
          </p>
        </div>
      </div>
    </section>
  );
}
