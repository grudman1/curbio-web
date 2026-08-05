// Two broker quotes — one large, one offset to the right column.

export function BrokerQuotes() {
  return (
    <section className="dp-sect--quotes">
      <div className="dp-container">
        <blockquote className="dp-quote-lg">
          “I used to hand sellers a contractor’s number and hope. Now I hand them a plan, a date,
          and a price — and the work starts without anyone writing a check.”
        </blockquote>
        <p className="dp-quote-attr">
          Dana Whitfield · Associate broker, RE/MAX Realty Centre — Rockville, MD
        </p>
        <div className="dp-quote-second">
          <span />
          <div>
            <blockquote className="dp-quote-sm">
              “Our office put Curbio in the listing presentation. It wins us the appointment
              before we’ve said a word about commission.”
            </blockquote>
            <p className="dp-quote-attr">
              Marcus Adeyemi · Managing broker, Keller Williams — Fairfax, VA
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
