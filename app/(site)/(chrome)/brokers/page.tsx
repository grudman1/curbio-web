import type { Metadata } from "next";
import Link from "next/link";
import { routeMetadata } from "@/config/routes";
import { MARKETS } from "@/config/markets";
import { PageHead, Section, SectionHeading } from "@/components/sections/Section";
import { NavyStatBand } from "@/components/sections/NavyStatBand";
import { QuoteCard } from "@/components/sections/QuoteCard";
import { CtaCloser } from "@/components/sections/CtaCloser";

// /brokers — brokerage LEADERSHIP, not individual agents. The path matches
// the migration plan; the nav label is "For Brokerages" (label and path
// differing is intentional).
//
// The angle: give every agent in the brokerage a pre-listing answer without
// the brokerage carrying the risk, the vendor management, or the liability.
// Primary CTA is the partnerships conversation (/contact?topic=brokerage);
// secondary is the standard free quote.

export const metadata: Metadata = {
  title: "For Brokerages — Curbio",
  description:
    "Give every agent in your brokerage a pre-listing renovation program — without your office carrying the contractors, the liability, or the receivables.",
  ...routeMetadata("/brokers"),
};

const PARTNERSHIP_POINTS: { head: string; line: string }[] = [
  {
    head: "No liability on your books",
    line: "Curbio is the licensed, insured general contractor of record. Your brokerage recommends a program — it never hires a trade, fronts a dollar, or warranties a roof.",
  },
  {
    head: "No vendor list to manage",
    line: "One partner replaces the office spreadsheet of handymen. Every project gets a dedicated Curbio project manager; your agents and staff manage nothing.",
  },
  {
    head: "A consistent answer in every listing presentation",
    line: "Every agent walks in with the same offer: fixed-price prep, professionally managed, nothing due until closing. New agents pitch it as confidently as your top producers.",
  },
  {
    head: "Pay-at-closing without brokerage receivables",
    line: "Financing for qualified sellers runs through Curbio's lending partner — the deferred payment never touches your accounts.",
  },
];

export default function BrokersPage() {
  return (
    <>
      <PageHead
        eyebrow="For brokerages"
        title="Every listing agent gets a renovation arm. Your brokerage carries none of it."
        lede="A Curbio partnership gives your whole office one pre-listing answer — fixed-price, professionally managed, paid at closing — without your brokerage taking on contractors, liability, or receivables."
      />

      <Section>
        <SectionHeading
          title="What a partnership looks like."
          lede="It is a program, not a referral list. Curbio does the work; your brokerage gets the consistency."
        />
        <ul className="c-featlist" style={{ maxWidth: "62ch" }}>
          {PARTNERSHIP_POINTS.map((p) => (
            <li key={p.head}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>
                <b>{p.head}.</b> {p.line}
              </span>
            </li>
          ))}
        </ul>
        <div className="c-cta-row">
          <Link className="c-cta" href="/contact?topic=brokerage">
            Talk to our partnerships team
          </Link>
          <Link className="c-cta--outline" href="/contact">
            Get a free quote
          </Link>
        </div>
      </Section>

      <Section variant="white" id="co-branded">
        <SectionHeading
          title="Co-branded partner pages."
          lede={
            <>
              Partner brokerages get a co-branded Curbio page their agents can send sellers —
              your brand next to ours, with the lead routed and attributed to your partnership.{" "}
              <Link className="c-ulink" href="/exp">
                See the live eXp Realty page
              </Link>
              .
            </>
          }
        />
      </Section>

      <Section id="enablement">
        {/* NEEDS FACT: confirm the enablement deliverables — listing-presentation
            assets, office training sessions, named per-market contact — match
            what partnerships actually commits to today. */}
        <SectionHeading
          title="Agent enablement, not just a logo swap."
          lede="A partnership comes with the material and training that make agents actually use it: listing-presentation assets, office training sessions with your local Curbio manager, and a named contact for every market you operate in — not a support queue."
        />
        <QuoteCard
          quote="Curbio in the listing presentation wins us the appointment."
          attribution="Marcus Adeyemi — managing broker, Keller Williams"
        />
      </Section>

      <Section variant="white" id="coverage">
        <SectionHeading
          title="Market coverage."
          lede="Curbio operates in these markets today, each with its own Home Services Manager. Multi-market brokerages get the same program, and the same standards, in every one."
        />
        <div style={{ maxWidth: 480 }}>
          {MARKETS.map((m) => (
            <div key={m.slug} className="c-mkt-row">
              <span className="c-mkt-name">{m.name}</span>
              <span className="c-mkt-state">{m.state}</span>
            </div>
          ))}
        </div>
      </Section>

      <NavyStatBand
        label="Curbio by the numbers"
        stats={[
          { figure: "8,000+", label: "homes prepped" },
          { figure: "$0", label: "until closing" },
          { figure: "1-year", label: "warranty" },
          { figure: "Licensed", label: "& insured" },
        ]}
      />

      <CtaCloser
        title={
          <>
            Put it in every
            <br />
            listing presentation.
          </>
        }
        ctaLabel="Talk to our partnerships team"
        ctaHref="/contact?topic=brokerage"
        fine="One conversation · no commitment · your market manager included"
      />
    </>
  );
}
