import Image from "next/image";
import Link from "next/link";

// The navy CTA closer — full-bleed sold-listing photo behind the final CTA.
// Every marketing page ends with this. Generalised from the homepage's
// HomeCloser; unlike the homepage's (still-inert) closer, the CTA here is a
// real link.

export function CtaCloser({
  title,
  ctaLabel = "Get a free estimate",
  ctaHref = "/contact",
  fine = "Two minutes · no cost · seller pays at closing",
  image = {
    src: "/sold/los-angeles/2276LaGranada_HollywoodHills.jpg",
    alt: "2276 La Granada, Hollywood Hills — prepped by Curbio",
  },
}: {
  title: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  fine?: string;
  image?: { src: string; alt: string };
}) {
  return (
    <section data-dark="true" className="c-closer">
      <Image src={image.src} alt={image.alt} fill sizes="100vw" style={{ objectFit: "cover" }} />
      <div className="c-closer-scrim" />
      <div className="c-container c-closer-inner">
        <h2>{title}</h2>
        <Link className="c-cta c-closer-cta" href={ctaHref}>
          {ctaLabel}
        </Link>
        <p className="c-closer-fine">{fine}</p>
      </div>
    </section>
  );
}
