// Pay at close — "See what your seller qualifies for", with the Notable
// inline estimator. Replaces the navy "Pay at closing is the product" ledger
// section (Gavin, Aug 7).
//
// This section shipped in v1, was cut in v2, and is now back by request —
// recovered from history rather than rebuilt, so the markup and the dpl2-*
// styles are the originals.
//
// NOT A LEAD FORM. The three fields are display-only and nothing on this
// page posts anywhere: the button is a plain link to Notable's own
// application at notablehome.com/curbio/apply, which is where the real
// estimate is produced. So this section adds an estimator UI without
// touching Curbio lead handling — the constraint that has applied to every
// field on this page from the start.
//
// If it is ever wired for real, the honest version is either an embed of
// Notable's own widget or a handoff that passes these three values through
// as query params — not a Curbio-side calculator, which would be inventing
// lending math we don't own.
//
// Terms below are Notable's published ones (up to $75K; staging, painting,
// repairs, moving; nothing due until close; eligibility check does not
// affect credit) — verified against notablehome.com/curbio/apply.

const BENEFITS = [
  "Sellers can access up to $75K for home prep",
  "Covers staging, painting, repairs, moving, and more",
  "Nothing due until the home closes — no monthly payments",
  "Checking eligibility takes minutes and won’t impact their credit",
];

const CREDIT_BANDS = ["760+", "720–759", "680–719", "640–679"];

export function QualifyCard() {
  return (
    <section id="payatclose" className="dp-sect dp-sect--sunken">
      <div className="dp-container">
        <div className="dpl2-grid">
          <div>
            <p className="dp-eyebrow">Pay at closing, powered by Notable</p>
            <h2 className="dp-h2" style={{ marginBottom: 20, maxWidth: "13em" }}>
              See what your seller qualifies for.
            </h2>
            <p className="dp-lede" style={{ maxWidth: "50ch" }}>
              Curbio partners with Notable Financing so qualified sellers can fund the entire
              project &mdash; and settle up from proceeds when the home sells.
            </p>
            <ul className="dpl2-check">
              {BENEFITS.map((b) => (
                <li key={b}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="dpl2-note">
              Financing provided by Notable Finance, LLC (NMLS #1824748) or Quorum Federal Credit
              Union. Loan eligibility is not guaranteed; all loans subject to credit approval and
              lender underwriting. Funds, interest, and fees are due at closing, listing
              termination, or twelve months after origination, whichever comes first.
            </p>
          </div>

          <div>
            <div className="dpl2-card">
              <h3 className="dpl2-cardh">Estimate what they&rsquo;d qualify for</h3>
              <div className="dpl2-field">
                <label className="dpl2-label" htmlFor="dpl2-credit">
                  Seller&rsquo;s credit score
                </label>
                <select className="dpl2-input" id="dpl2-credit" defaultValue="">
                  <option value="" disabled>
                    Select&hellip;
                  </option>
                  {CREDIT_BANDS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="dpl2-field">
                <label className="dpl2-label" htmlFor="dpl2-price">
                  Estimated sale price
                </label>
                <input
                  className="dpl2-input"
                  id="dpl2-price"
                  type="text"
                  inputMode="numeric"
                  placeholder="$ 700,000"
                />
              </div>
              <div className="dpl2-field">
                <label className="dpl2-label" htmlFor="dpl2-balance">
                  Outstanding mortgage balance
                </label>
                <input
                  className="dpl2-input"
                  id="dpl2-balance"
                  type="text"
                  inputMode="numeric"
                  placeholder="$ 250,000"
                />
              </div>
              <a
                className="dpl2-btn"
                href="https://notablehome.com/curbio/apply"
                target="_blank"
                rel="noopener"
              >
                See their estimate
              </a>
              <p className="dpl2-fine">
                Takes about two minutes &middot; No impact on credit score
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
