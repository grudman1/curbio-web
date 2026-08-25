import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { MARKETS } from "@/config/markets";
import { PageHead, Section } from "@/components/sections/Section";
import { CtaCloser } from "@/components/sections/CtaCloser";
import { ContactForm } from "./ContactForm";

// /contact — one form into the EXISTING lead pipeline (/api/lead,
// source: "contact"). No new API route; the payload contract, validation and
// attribution capture are untouched — see ContactForm.tsx and the comment
// block at the top of app/api/lead/route.ts before changing anything there.
//
// The rail beside the form renders the markets and their managers from
// config/markets.ts — never retyped.

export const metadata: Metadata = {
  title: "Contact — Curbio",
  description:
    "Reach Curbio: get a free quote, talk through a listing, or start a brokerage partnership. Seven markets, a manager in each.",
  ...routeMetadata("/contact"),
};

const PHONE_DISPLAY = "(844) 944-2629";
const PHONE_TEL = "+18449442629";

export default function ContactPage() {
  return (
    <>
      <PageHead
        eyebrow="Contact"
        title="Talk to a person, not a queue."
        lede="Tell us about the listing — or just ask the question. Your message routes to the manager for your market."
      />

      <Section>
        <div className="c-contact-grid">
          <ContactForm />

          <aside>
            <div className="c-contact-rail-block">
              <h2 className="c-contact-rail-h">Call or write</h2>
              <p className="c-contact-rail-line">
                <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
              </p>
              <p className="c-contact-rail-line">
                <a href="mailto:leads@curbio.com">leads@curbio.com</a>
              </p>
              {/* NEEDS FACT: confirm phone hours — weekday window and timezone
                  are not recorded anywhere in this repo. */}
              <p className="c-contact-rail-sub">Monday–Friday, business hours in your market.</p>
            </div>

            <div className="c-contact-rail-block">
              <h2 className="c-contact-rail-h">Your market, your manager</h2>
              {MARKETS.map((m) => (
                <div key={m.slug} className="c-contact-mkt">
                  <span className="c-contact-mkt-name">{m.displayName}</span>
                  <span className="c-contact-mkt-hsm">{m.hsm.name}</span>
                </div>
              ))}
              <p className="c-contact-rail-sub" style={{ marginTop: 14 }}>
                Not a call center — your ZIP routes to one of these people.
              </p>
            </div>
          </aside>
        </div>
      </Section>

      <CtaCloser
        title={
          <>
            Or skip the form —
            <br />
            call your manager.
          </>
        }
        ctaLabel={`Call ${PHONE_DISPLAY}`}
        ctaHref={`tel:${PHONE_TEL}`}
        fine="Free consult · fixed-price estimate · seller pays at closing"
      />
    </>
  );
}
