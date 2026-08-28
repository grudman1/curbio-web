import Image from "next/image";

// The closer — full-bleed sold-listing photo behind the final CTA.
//
// The CTA is an anchor to the hero's own form (#get-estimate), NOT a second
// lead form: there is exactly one hero field on this page and sending the
// reader back to it means one form to instrument, one to maintain, and one
// set of attribution behaviour. It is a plain in-page href, so it works
// before hydration and lands correctly with JS off.

export function HomeCloser({
  /** Where the CTA goes. Defaults to the homepage's own hero form; pages
   *  without one (e.g. /our-work) pass a real route. */
  href = "#get-estimate",
}: { href?: string } = {}) {
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
        <a className="c-cta c-closer-cta" href={href}>
          Get a free estimate
        </a>
        <p className="c-closer-fine">Two minutes · no cost · seller pays at closing</p>
      </div>
    </section>
  );
}
