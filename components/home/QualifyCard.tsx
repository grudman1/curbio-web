import { EstimatorCard } from "./EstimatorCard";

// Pay at close — "See what your seller qualifies for", with the Notable
// inline estimator. Replaces the navy "Pay at closing is the product" ledger
// section (Gavin, Aug 7).
//
// This section shipped in v1, was cut in v2, and is back by request. As of
// Aug 7 the card is LIVE: it submits the three fields to Notable's own
// estimator API through our server-side proxy (app/api/notable-estimate —
// see there for why a proxy; Notable blessed the usage but makes no changes
// on their end) and renders the real credit limit and APR inline. The
// interactive card is EstimatorCard.tsx — a deliberately narrow client
// boundary; this file and the left column stay server-rendered.
//
// STILL NOT A LEAD FORM. What crosses the wire is three numbers and a state
// code — no name, no contact, nothing touching /api/lead, Redis, or the
// CRM. The application itself stays on Notable's side (the apply links).
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

export function QualifyCard() {
  return (
    <section id="payatclose" className="dp-sect">
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
            <EstimatorCard />
          </div>
        </div>
      </div>
    </section>
  );
}
