import Image from "next/image";
import type { Giveaway } from "@/config/giveaways";
import { PARTNERS } from "@/lib/partners";
import { CurbioLogoLink } from "./CurbioLogoLink";
import { PRIVACY_URL } from "./links";

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL RULES for a giveaway — generated from its settings file, so the
// rules, the page and the drawing cannot state three different closing times
// or three different prize lists.
//
// What is written here is STRUCTURE and the terms marketing set: who may
// enter, when, how, what the bonus is and what the free routes to it are, what
// is won, how winners are drawn and notified. It is a draft for a reviewer, not
// legal advice. The reviewer supplied, for this event: the sponsor's name and
// address, the kit's approximate retail value, and the governing law. Venue,
// arbitration and other dispute terms were NOT supplied and are not drafted —
// rather than guessed.
//
// A missing sponsor name or address still renders as an amber MARKER and puts
// a draft notice at the top of the page. That is on purpose: rules with a
// quietly empty field look finished, and rules that look finished get
// published. With both set — as they are now — the page shows neither.
//
// The word "raffle" appears nowhere. Utah prohibits raffles; a free prize
// drawing is a different thing, and the rules must not call it the wrong one.
// ─────────────────────────────────────────────────────────────────────────────

function Pending({ children }: { children: string }) {
  return (
    <mark className="rounded-sm border border-dashed border-accent-active bg-accent-subtle px-1.5 font-bold text-content">
      [{children}]
    </mark>
  );
}

const NUMBER_WORD = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** "five (5)" — the form rules are written in. */
function count(n: number): string {
  return `${NUMBER_WORD[n] ?? n} (${n})`;
}

const capitalise = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const dollars = (n: number) => `$${n.toLocaleString("en-US")}`;

export function GiveawayRules({ giveaway }: { giveaway: Giveaway }) {
  const { event, rules, kit, bonusEntries, drawing } = giveaway;
  const exp = PARTNERS.exp;
  const publicUrl = `curbio.com${giveaway.path}`;
  const isDraft = !rules.sponsorName || !rules.sponsorAddress;
  const title = `Curbio ${event.shortName} Giveaway`;
  const maxEntries = 1 + bonusEntries;
  const totalValue = kit.approxValueUsd * kit.winners;

  // Section numbers are counted as they render, so adding or moving a section
  // can never leave a stale number — or a stale "see Section 7".
  let n = 0;
  const next = () => ++n;

  return (
    <div className="min-h-screen bg-surface font-sans text-content">
      <header className="bg-surface-inverse">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3.5">
            <CurbioLogoLink className="h-5 sm:h-7" priority />
            <span className="h-6 w-px flex-none bg-white/40" aria-hidden />
            <Image
              src={exp.logoPath}
              alt={exp.coBrand.logoAlt}
              width={470}
              height={95}
              unoptimized
              className="block h-[18px] w-auto min-w-0 sm:h-[26px]"
            />
          </div>
          <a href={giveaway.path} className="flex-none font-sans text-small font-bold text-content-inverse underline">
            Back to the giveaway
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-5 py-10 sm:px-8 lg:py-16">
        {isDraft && (
          <p className="m-0 mb-8 rounded-lg border border-dashed border-accent-active bg-accent-subtle px-4 py-3 font-sans text-small font-semibold text-content">
            Draft for review. Details marked in amber are still to be confirmed.
          </p>
        )}

        <p className="m-0 font-sans text-label font-black uppercase text-state-info">Official Rules</p>
        <h1 className="mt-3 text-[clamp(32px,5vw,48px)] leading-[1.1]">{title}</h1>
        <span className="mt-5 block h-[3px] w-14 rounded-[2px] bg-accent" aria-hidden />

        <p className="mt-8 font-sans text-body font-bold leading-[1.55]">
          NO PURCHASE NECESSARY TO ENTER OR WIN. A PURCHASE OR PAYMENT OF ANY KIND WILL NOT INCREASE YOUR CHANCES OF
          WINNING. VOID WHERE PROHIBITED.
        </p>

        <Section n={next()} title="Sponsor">
          <p>
            The {title} (the &ldquo;Giveaway&rdquo;) is sponsored by{" "}
            {rules.sponsorName ?? <Pending>SPONSOR LEGAL NAME</Pending>},{" "}
            {rules.sponsorAddress ?? <Pending>SPONSOR ADDRESS</Pending>} (&ldquo;Sponsor&rdquo;).
          </p>
        </Section>

        <Section n={next()} title="Eligibility">
          <p>
            The Giveaway is open to legal residents of the United States, including the District of Columbia, who are
            at least {rules.minAge} years old at the time of entry and who are real estate professionals, such as
            licensed real estate agents and brokers.
          </p>
          <p>
            Employees of Sponsor, and their immediate family members (spouse, parents, siblings and children) and
            members of their households, are not eligible. Void where prohibited by law.
          </p>
        </Section>

        <Section n={next()} title="Entry period">
          <p>
            The Giveaway begins when the entry page at {publicUrl} is published, on or about {giveaway.opens}, and ends
            on {drawing.rulesDate} at {drawing.rulesTime} (the &ldquo;Entry Period&rdquo;). Sponsor&rsquo;s computer is
            the official clock. Entries received after the Entry Period ends are not eligible.
          </p>
        </Section>

        <Section n={next()} title="How to enter">
          <p>
            No purchase or payment of any kind is necessary to enter or win. During the Entry Period, visit {publicUrl}{" "}
            and complete and submit the entry form with your name, email address, phone number, market and your answer
            to the question about upcoming listings, or ask a Curbio team member at Booth #{event.booth} to enter you.
            You may also enter in writing: email <a href={`mailto:${rules.requestEmail}`}>{rules.requestEmail}</a> with
            your name, email address, phone number, market and your answer to the question about upcoming listings, so
            that it is received before the Entry Period ends, and a Curbio team member will enter you. Every method of
            entry is equal: you will receive {count(1)} entry.
          </p>
          <p>
            Limit {count(1)} entry per person and per email address. If you enter more than once, by any method, your
            existing entry is updated; it is not counted again. You must enter yourself, or ask a Curbio team member to
            enter you as described above. Entries made by automated means are void.
          </p>
        </Section>

        <Section n={next()} title="Bonus entries">
          <p>
            After you have entered, you can receive {count(bonusEntries)} additional entries, once, in any one of the
            following ways. Each way earns the same {count(bonusEntries)} bonus entries; the free ways count exactly as
            much as booking a call.
          </p>
          <ul>
            <li>
              <strong>Book a call.</strong> Book a call with your local Curbio manager using the link on the
              confirmation screen, before the Entry Period ends.
            </li>
            <li>
              <strong>Visit the booth (free alternative).</strong> Visit Curbio at Booth #{event.booth} in the{" "}
              {event.hall} at {event.name} during exhibit hours within the Entry Period and talk with a member of the
              Curbio team, who will add your bonus entries.
            </li>
            <li>
              <strong>Ask in writing (free alternative).</strong> Email{" "}
              <a href={`mailto:${rules.requestEmail}`}>{rules.requestEmail}</a> from the address you entered with,
              using the subject line &ldquo;{event.shortName} Giveaway bonus entries&rdquo;, so that it is received
              before the Entry Period ends.
            </li>
          </ul>
          <p>
            You do not need to book a call, buy anything or take part in a sales conversation to receive the bonus
            entries. The most any person can hold is {count(maxEntries)} entries.
          </p>
        </Section>

        <Section n={next()} title="Drawing and odds">
          <p>
            On or about {drawing.rulesDate} at {drawing.rulesTime}, at Booth #{event.booth}, Sponsor will select{" "}
            {count(kit.winners)} potential winners in a random drawing from all eligible entries received during the
            Entry Period, and will draw alternates, in order, at the same time. Each potential winner receives one{" "}
            {count(1)} Kit (see Section {n + 1}). Limit {count(1)} Kit per person: a person can win only once,
            however many entries they hold.
          </p>
          <p>
            The odds of winning depend on the number of eligible entries received. You do not need to be present to
            win.
          </p>
        </Section>

        <Section n={next()} title="Prize">
          <p>
            {capitalise(count(kit.winners))} identical {kit.name}s (each a &ldquo;Kit&rdquo;) will be awarded, one Kit
            to each winner. Every winner receives the entire Kit. Each Kit contains all of the following:
          </p>
          <ul>
            {kit.items.map((item) => (
              <li key={item.name}>{item.name}</li>
            ))}
          </ul>
          <p>
            Approximate retail value: {dollars(kit.approxValueUsd)} per Kit, {dollars(totalValue)} in total for all{" "}
            {count(kit.winners)} Kits.
          </p>
          <p>
            Prizes cannot be transferred or exchanged for cash. Sponsor may substitute an item of equal or greater
            value if an item becomes unavailable. The gift card is subject to the issuer&rsquo;s terms. Each winner is
            responsible for any taxes on their Kit.
          </p>
        </Section>

        <Section n={next()} title="Notifying winners">
          <p>
            Sponsor will attempt to notify each potential winner by email and by phone, using the details on their
            entry, within {rules.notifyWithinHours} hours after the drawing. Kits will be handed over at the booth or
            sent to an address in the United States at Sponsor&rsquo;s expense.
          </p>
          <p>
            A potential winner who does not respond within {rules.respondWithinDays} days of the first attempt, who is
            not eligible, or who declines the Kit forfeits it. The Kit will then be awarded to the next alternate
            winner drawn, in the order the alternates were drawn.
          </p>
        </Section>

        <Section n={next()} title="General conditions">
          <p>
            By entering, you agree to these Official Rules and to Sponsor&rsquo;s decisions, which are final. Sponsor
            may disqualify anyone who tampers with the entry process or breaks these rules.
          </p>
          <p>
            Sponsor is not responsible for entries that are lost, late, incomplete or misdirected, or for technical
            failures of any kind. If fraud, a technical failure or anything else outside Sponsor&rsquo;s control
            compromises the Giveaway, Sponsor may cancel, suspend or change it, and may select the winners from the
            eligible entries received up to that point.
          </p>
        </Section>

        <Section n={next()} title="Release">
          <p>
            By taking part, you release Sponsor and its officers, employees and agents from any liability arising
            from your participation in the Giveaway or from the acceptance, use or misuse of a prize, to the extent
            the law allows.
          </p>
        </Section>

        <Section n={next()} title="Governing law">
          <p>These Official Rules and the Giveaway are governed by the laws of the {rules.governingLaw}.</p>
        </Section>

        <Section n={next()} title="Privacy and communications">
          <p>
            Information you submit is used as described in Curbio&rsquo;s{" "}
            <a href={PRIVACY_URL} target="_blank" rel="noreferrer noopener">
              Privacy Policy
            </a>
            . As stated on the entry form, by entering you consent to calls and texts from Curbio (reply STOP to opt
            out of texts), and you will receive occasional emails from Curbio, which you can unsubscribe from at any
            time. Agreeing to be contacted is not a condition of buying anything.
          </p>
        </Section>

        <Section n={next()} title="No affiliation">
          <p>
            This Giveaway is run by Sponsor alone. It is not sponsored, endorsed or administered by, or associated
            with, eXp Realty, eXp World Holdings, Inc., Apple Inc. or Amazon.com, Inc. Apple and AirPods are
            trademarks of Apple Inc. Amazon is a trademark of Amazon.com, Inc. or its affiliates.
          </p>
        </Section>

        <Section n={next()} title="Winners list">
          <p>
            For the names of the winners, email <a href={`mailto:${rules.requestEmail}`}>{rules.requestEmail}</a> with
            the subject line &ldquo;{event.shortName} Giveaway winners&rdquo; within 60 days after the Entry Period
            ends.
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 [&_a]:font-semibold [&_a]:text-content [&_a]:underline [&_li]:mt-2 [&_ol]:m-0 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:m-0 [&_p]:mt-3 [&_p]:font-sans [&_p]:text-body [&_p]:leading-[1.6] [&_p]:text-content [&_ul]:m-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h2 className="text-[22px] leading-[1.25]">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}
