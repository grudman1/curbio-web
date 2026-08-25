import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { routeMetadata } from "@/config/routes";
import { SERVICES, SERVICE_CATEGORIES } from "@/config/services";
import { PageHead, Section, SectionHeading } from "@/components/sections/Section";
import { CtaCloser } from "@/components/sections/CtaCloser";

// /services — the index of the ten services, grouped by category, rendered
// entirely from config/services.ts (the same source the homepage marquee
// renders). Each service is an ANCHOR here (/services#kitchen-updates), not
// its own route yet; per-service pages at /services/[slug] are a later step
// the config is already shaped for.

export const metadata: Metadata = {
  title: "Services — Curbio",
  description:
    "Everything Curbio takes on before a home lists: painting, flooring, kitchens, baths, roofing, staging, and more — one fixed price, paid at closing.",
  ...routeMetadata("/services"),
};

export default function ServicesPage() {
  return (
    <>
      <PageHead
        eyebrow="Services"
        title="All the work that moves the price."
        lede="Ten service lines, one contract, one project manager. Scope one room or the whole house — every project is fixed-price and settles at closing."
      />

      <Section>
        {SERVICE_CATEGORIES.map((cat) => (
          <div key={cat} className="c-svc-cat">
            <h2 className="c-svc-cath">{cat}</h2>
            <div className="c-svc-grid">
              {SERVICES.filter((s) => s.category === cat).map((s) => (
                <article key={s.slug} id={s.slug} className="c-svc-card">
                  <div className="c-svc-img">
                    <Image
                      src={s.photo}
                      alt={s.name}
                      fill
                      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="c-svc-body">
                    <h3 className="c-svc-name">{s.name}</h3>
                    <p className="c-svc-line">{s.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section variant="white">
        <SectionHeading
          title="Not sure what the house needs?"
          lede={
            <>
              That&rsquo;s the consult. Your local manager walks the property with the agent and
              recommends only the work the market rewards — see{" "}
              <Link className="c-ulink" href="/how-it-works">
                how it works
              </Link>
              .
            </>
          }
        />
      </Section>

      <CtaCloser
        title={
          <>
            Scope it in
            <br />
            two minutes.
          </>
        }
      />
    </>
  );
}
