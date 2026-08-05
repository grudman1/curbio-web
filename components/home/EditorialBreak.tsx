// The editorial break — one serif paragraph that says what Curbio is,
// offset on an asymmetric grid.

export function EditorialBreak() {
  return (
    <section className="dp-sect--editorial">
      <div className="dp-container dp-edit-grid">
        <div aria-hidden="true" />
        <p className="dp-edit-copy">
          Curbio is a renovation company that works for real estate agents. We take on everything
          between “needs work” and “ready to list” — our licensed crews, our project manager, our
          warranty — and the seller pays nothing until the home closes. You keep the client. The
          house stops being the reason a listing sits.
        </p>
      </div>
    </section>
  );
}
