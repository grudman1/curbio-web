import type { Metadata } from "next";
import { routeMetadata } from "@/config/routes";
import { PageHead, Section, SectionHeading } from "@/components/sections/Section";
import { StepList } from "@/components/sections/NumberedSteps";
import { CtaCloser } from "@/components/sections/CtaCloser";
import { DealTimeline } from "@/components/home/DealTimeline";
import { QualifyCard } from "@/components/home/QualifyCard";

// /how-it-works — ONE page, agents and sellers together. The old
// /how-it-works/agents · /how-it-works/sellers split was placeholder IA and
// is gone; the narrative below is written so both audiences can read their
// own role in each step.
//
// Structure: the seven-step narrative (StepList — the homepage numbered-step
// language) → the real deal timeline (reused from the homepage) → the
// Curbio-vs-traditional-contractor table → the pay-at-closing explanation
// (QualifyCard, with the live Notable estimator — this is where that content
// lives now that Pay at Close has no nav item) → the navy closer.

export const metadata: Metadata = {
  title: "How It Works — Curbio",
  description:
    "How Curbio gets a home market-ready: walk-through, fixed-price estimate, a dedicated project manager, and nothing due until the home closes.",
  ...routeMetadata("/how-it-works"),
};

const STEPS = [
  {
    num: "01",
    title: "Consult and walk the property",
    line: "Your local Home Services Manager walks the home with the agent — in person or from photos — and talks through what the market actually rewards fixing.",
  },
  {
    num: "02",
    title: "Scope and fixed-price estimate",
    line: "A written scope with one fixed price. No open-ended bids, no allowances that balloon later — the number the seller approves is the number that settles at closing.",
  },
  {
    num: "03",
    title: "Agent and seller approve",
    line: "The agent stays in the loop by design: seller and agent sign off on the same scope, so nobody is surprised by what the crews show up to do.",
  },
  {
    num: "04",
    title: "A project manager takes over",
    line: "One dedicated project manager owns the schedule, the trades, and the communication. The seller never manages a contractor; neither does the agent.",
  },
  {
    num: "05",
    title: "The work gets done",
    line: "Licensed, insured crews working at the pace of real estate — sequenced so paint, floors, and staging land in the right order, tracked step by step in the app.",
  },
  {
    num: "06",
    title: "The listing goes live",
    line: "Punch-out, deep clean, staging, photos. The finish date is set against the listing date from day one, not discovered at the end.",
  },
  {
    num: "07",
    title: "Paid at closing",
    line: "The project settles as one line on the closing statement. The seller writes no checks along the way — nothing is due until the home sells.",
  },
];

// The comparison rows. First data column is Curbio (amber-tinted), second is
// the traditional route. Claims here stick to what the site already asserts
// (fixed price, $0 until closing, 1-year warranty, licensed & insured).
const COMPARISON: { label: string; curbio: string; traditional: string }[] = [
  {
    label: "Paying for the work",
    curbio: "Nothing until closing — the project settles from sale proceeds.",
    traditional: "Deposit up front, progress payments along the way.",
  },
  {
    label: "The estimate",
    curbio: "One fixed price, approved before work starts.",
    traditional: "Open bids and change orders; the final number moves.",
  },
  {
    label: "Who manages the project",
    curbio: "A dedicated Curbio project manager.",
    traditional: "The seller — or the agent, off the side of their desk.",
  },
  {
    label: "Scheduling",
    curbio: "Sequenced against the listing date from day one.",
    traditional: "The contractor's next opening, job by job.",
  },
  {
    label: "The trades",
    curbio: "Licensed and insured, coordinated under one contract.",
    traditional: "Found, vetted, and coordinated by the homeowner.",
  },
  {
    label: "After the work",
    curbio: "1-year warranty on the work.",
    traditional: "Varies by contractor — often nothing in writing.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHead
        eyebrow="How it works"
        title="From listing appointment to closing table."
        lede="One partner handles the whole pre-listing project — scoped up front, managed for you, and paid for when the home sells. Here is the entire process."
      />

      <Section>
        <StepList steps={STEPS} />
      </Section>

      {/* The proof that the seven steps aren't a diagram: a real project,
          dated, with its real numbers. Reused from the homepage. */}
      <DealTimeline />

      <Section id="curbio-vs-contractor">
        <SectionHeading
          title="Curbio, next to the way it's usually done."
          lede="Most sellers have exactly one alternative: find a contractor, front the money, and run the project themselves while trying to move."
        />
        <div className="c-compare-wrap">
          <table className="c-compare">
            <thead>
              <tr>
                <th scope="col">&nbsp;</th>
                <th scope="col">With Curbio</th>
                <th scope="col">Traditional contractor</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.curbio}</td>
                  <td>{row.traditional}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Pay at closing lives HERE now — the nav item is gone, the message
          is not. QualifyCard carries the full explanation plus the live
          Notable estimator. The header's announce bar links to this anchor. */}
      <div id="pay-at-closing">
        <QualifyCard />
      </div>

      <CtaCloser
        title={
          <>
            See it on your
            <br />
            next listing.
          </>
        }
      />
    </>
  );
}
