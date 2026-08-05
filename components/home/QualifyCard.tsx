// "See what your seller qualifies for" — Notable financing explainer plus the
// estimator card.
//
// STUB: the three estimator fields are display-only — nothing reads them and
// nothing submits. The one live control is the design file's own <a> straight
// to Notable's public application page; no Curbio lead handling is involved
// anywhere in this section.

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
              {[
                "Sellers can access up to $75K for home prep",
                "Covers staging, painting, repairs, moving, and more",
                "Nothing due until the home closes — no monthly payments",
                "Checking eligibility takes minutes and won’t impact their credit",
              ].map((item) => (
                <li key={item}>
                  <svg viewBox="0 0 24 24">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{item}</span>
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
                  <option>760+</option>
                  <option>720–759</option>
                  <option>680–719</option>
                  <option>640–679</option>
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
              <p className="dpl2-fine">Takes about two minutes &middot; No impact on credit score</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
