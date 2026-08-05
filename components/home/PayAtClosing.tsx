// "Pay at closing is the product" — the dark section with the seller's
// ledger. data-dark drives the header's frosted-dark tone while this section
// is behind the fixed bar.

const LEDGER_LINES = ["Scope approved", "Crews start", "Listing goes live", "Under contract"];

export function PayAtClosing() {
  return (
    <section data-dark="true" className="dp-sect--payledger">
      <div className="dp-container dp-pay-grid">
        <div>
          <h2 className="dp-h2">Pay at closing is the product.</h2>
          <p className="dp-pay-body">
            Curbio created pay-at-closing renovation. No deposits, no draws, no loan for your
            client to qualify for. We carry every cost while the work happens and while the home
            sells — the project settles as one line on the closing statement.
          </p>
          <p className="dp-pay-fine">Qualified sellers pay from proceeds when the home sells.</p>
        </div>
        <div className="dp-pay-ledger">
          <p className="dp-pay-ledgerh">The seller’s ledger</p>
          {LEDGER_LINES.map((line) => (
            <div key={line} className="dp-pay-line">
              <span>{line}</span>
              <span className="dp-leader" />
              <span>$0</span>
            </div>
          ))}
          <div className="dp-pay-total">
            <div>
              <span className="dp-pay-total-label">Settled at closing</span>
              <span className="dp-pay-total-val">from proceeds</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
