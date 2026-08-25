import Image from "next/image";

// The closer — full-bleed sold-listing photo behind the final CTA.
// STUB: the CTA is an inert span, exactly as in the approved design file;
// wiring it to the lead flow is a separate step.

export function HomeCloser() {
  return (
    <section data-dark="true" className="c-closer">
      <Image
        src="/sold/los-angeles/2276LaGranada_HollywoodHills.jpg"
        alt="2276 La Granada, Hollywood Hills — prepped by Curbio"
        fill
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />
      <div className="c-closer-scrim" />
      <div className="c-container c-closer-inner">
        <h2>
          Your next listing,
          <br />
          handled.
        </h2>
        <span className="c-cta c-closer-cta">Get a free estimate</span>
        <p className="c-closer-fine">Two minutes · no cost · seller pays at closing</p>
      </div>
    </section>
  );
}
