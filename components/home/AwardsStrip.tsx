// Awards / reviews / press — thin, low emphasis, one line.
//
// [PENDING DATA] Award names, press outlets, and the review figure need to be
// supplied — nothing on this machine or curbio.com's text was solid enough to
// cite, and inventing credentials is off the table. The strip renders the
// marked slots so the layout is reviewable.

export function AwardsStrip() {
  return (
    <section data-dark="true" className="c-strip" aria-label="Awards, reviews, and press">
      <div className="c-container">
        <p className="c-strip-row">
          <b>[Award]</b>
          <span className="c-proof-sep" aria-hidden>
            ·
          </span>
          <b>[Award]</b>
          <span className="c-proof-sep" aria-hidden>
            ·
          </span>
          <span>
            <b>[rating]</b> across <b>[count]</b> reviews
          </span>
          <span className="c-proof-sep" aria-hidden>
            ·
          </span>
          <span>
            As seen in <b>[press]</b>
          </span>
        </p>
      </div>
    </section>
  );
}
