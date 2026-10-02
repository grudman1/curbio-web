"use client";

import Image from "next/image";
import { RichText } from "@/components/campaign/RichText";
import { Confetti } from "./GiveawayHero";
import { useGiveaway } from "./GiveawayShell";
import { GiveawayIcon } from "./icons";

// The three pieces of the page, besides the hero, that read differently once
// the entry period has ended. They are client components for that one reason:
// the page is prerendered, and "is it closed yet" is a question about now.

const PILL =
  "inline-flex flex-none items-center gap-2.5 whitespace-nowrap rounded-full bg-accent font-sans font-black text-content no-underline transition-[background-color,box-shadow] duration-base ease-out hover:bg-accent-hover hover:text-content hover:shadow-accent";

/** Header button. Jumps to the FORM, not to the top of the hero — on a phone
 *  those are a screen apart. */
export function HeaderCta() {
  const { giveaway, closed } = useGiveaway();
  const { headerCta, closed: closedCopy } = giveaway.copy;
  return (
    <a href="#enter" className={`${PILL} min-h-11 px-3.5 text-small sm:px-5 sm:text-[15px]`}>
      {closed ? (
        closedCopy.headerCta
      ) : (
        <>
          <span className="sm:hidden">{headerCta.short}</span>
          <span className="hidden sm:inline">{headerCta.full}</span>
        </>
      )}
    </a>
  );
}

/** "What's in the kit". Gone once the drawing has been held — a grid of prizes
 *  nobody can win any more is an advert for something that is over. */
export function PrizeSection() {
  const { giveaway, closed } = useGiveaway();
  if (closed) return null;
  const { prizes: copy } = giveaway.copy;

  return (
    <section className="bg-surface-raised py-14 lg:py-[104px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-5 sm:px-8 lg:gap-12 lg:px-10">
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <p className="m-0 font-sans text-label font-black uppercase text-state-info">{copy.eyebrow}</p>
          <h2 className="text-[clamp(32px,4.4vw,52px)] leading-[1.1]">
            <RichText>{copy.headline}</RichText>
          </h2>
          <span className="block h-[3px] w-14 rounded-[2px] bg-accent" aria-hidden />
          <p className="m-0 font-sans text-body text-content-muted">{copy.note}</p>
        </div>

        <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5 lg:gap-5">
          {giveaway.prizes.map((prize, i) => (
            <li
              key={prize.name}
              className="flex flex-col gap-3.5 rounded-xl border border-edge bg-surface px-5 py-6 transition-[box-shadow,background-color] duration-base ease-out hover:bg-surface-raised hover:shadow-[0_12px_28px_rgba(13,37,77,0.10)]"
            >
              <div className="flex items-start justify-between">
                {prize.photo ? (
                  <Image
                    src={prize.photo}
                    alt=""
                    width={128}
                    height={128}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-sunken text-content">
                    <GiveawayIcon name={prize.icon} size={28} />
                  </span>
                )}
                <span className="font-serif text-[15px] font-semibold text-accent-active">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-sans text-[17px] font-bold leading-[1.3] text-content">{prize.name}</span>
                <span className="font-sans text-small leading-[1.45] text-content-muted">{prize.line}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const CLOSER_FLOATERS = [
  { left: "8%", top: "18%", w: 10, h: 20, r: 24, t: 6, tone: "var(--amber)" },
  { left: "86%", top: "24%", w: 12, h: 12, r: 0, round: true, tone: "var(--sage)" },
  { left: "78%", top: "76%", w: 20, h: 6, r: -20, t: 7, tone: "var(--amber)" },
  { left: "16%", top: "80%", w: 8, h: 8, r: 0, round: true, tone: "var(--white)" },
];

export function CloserSection() {
  const { giveaway, closed } = useGiveaway();
  const { closer, closed: closedCopy } = giveaway.copy;

  return (
    <section className="relative overflow-hidden bg-surface-inverse py-16 text-content-inverse lg:py-28">
      {/* Wide screens only, as in the hero: on a phone the pieces land on the
          text. */}
      {!closed && (
        <div className="hidden lg:block">
          <Confetti pieces={CLOSER_FLOATERS} />
        </div>
      )}
      <div className="relative mx-auto flex w-full max-w-[860px] flex-col items-center gap-6 px-5 text-center sm:px-10">
        <Image src="/logo/logo-house-amber.png" alt="" width={96} height={96} className="h-auto w-12" />
        <h2 className="text-[clamp(34px,5.4vw,64px)] leading-[1.08] text-content-inverse">
          <RichText>{closer.headline}</RichText>
        </h2>
        <a href="#enter" className={`${PILL} min-h-[58px] px-9 text-[17px]`}>
          {closed ? closedCopy.headerCta : closer.cta}
          <GiveawayIcon name="arrow" size={18} stroke={2.25} />
        </a>
        <p className="m-0 font-sans text-[13px] text-brand-subtle">
          {!closed && <>{closer.finePrint} </>}
          <a href={giveaway.rules.path} className="text-content-inverse underline">
            Official Rules
          </a>{" "}
          ·{" "}
          <a
            href="https://curbio.com/privacy-policy"
            target="_blank"
            rel="noreferrer noopener"
            className="text-content-inverse underline"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </section>
  );
}
