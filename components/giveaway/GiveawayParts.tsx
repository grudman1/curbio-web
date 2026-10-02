"use client";

import Image from "next/image";
import { RichText } from "@/components/campaign/RichText";
import { goToEntry } from "./enter";
import { useGiveaway } from "./GiveawayShell";
import { GiveawayIcon } from "./icons";

// The pieces of the page, besides the hero, that read differently once the
// entry period has ended. They are client components for that one reason: the
// page is prerendered, and "is it closed yet" is a question about now.

const PILL =
  "inline-flex flex-none items-center gap-2.5 whitespace-nowrap rounded-full bg-accent font-sans font-black text-content no-underline transition-[background-color,box-shadow] duration-base ease-out hover:bg-accent-hover hover:text-content hover:shadow-accent";

/** Header button. Takes the visitor to the FORM, not to the top of the hero —
 *  on a phone those are a screen apart — and into its first field. */
export function HeaderCta() {
  const { giveaway, closed } = useGiveaway();
  const { headerCta, closed: closedCopy } = giveaway.copy;
  return (
    <a href="#enter" onClick={goToEntry} className={`${PILL} min-h-11 px-3.5 text-small sm:px-5 sm:text-[15px]`}>
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

const fill = (text: string, winners: number) => text.replace(/\{winners\}/g, String(winners));

/**
 * The kit. ONE prize with five things in it, shown as one: the items sit inside
 * a single tinted, bordered panel with a "×5 winners" badge, under a line that
 * says every winner gets everything. There is no numbering and no order,
 * because there is no order — each winner receives the whole kit.
 *
 * Gone once the entry period has ended: a grid of prizes nobody can win any
 * more is an advert for something that is over.
 */
export function KitSection() {
  const { giveaway, closed } = useGiveaway();
  if (closed) return null;
  const { kit, copy } = giveaway;
  const text = copy.kit;

  return (
    <section className="bg-surface-raised py-14 lg:py-[104px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7 px-5 sm:px-8 lg:gap-12 lg:px-10">
        <div className="flex max-w-[720px] flex-col gap-3.5">
          <p className="m-0 font-sans text-label font-black uppercase text-state-info">{text.eyebrow}</p>
          <h2 className="text-[clamp(32px,4.4vw,52px)] leading-[1.1]">
            <RichText>{text.headline}</RichText>
          </h2>
          <span className="block h-[3px] w-14 rounded-[2px] bg-accent" aria-hidden />
          <p className="m-0 font-sans text-[clamp(17px,1.7vw,20px)] font-bold leading-[1.4] text-content">
            {fill(text.label, kit.winners)}
          </p>
        </div>

        <div className="relative rounded-[20px] border-2 border-accent bg-accent-subtle px-4 pb-4 pt-8 sm:px-6 sm:pb-6 sm:pt-9 lg:px-8 lg:pb-8 lg:pt-10">
          <span className="absolute -top-[18px] right-5 inline-flex items-center rounded-full bg-brand px-4 py-2 font-sans text-label font-black uppercase text-content-inverse sm:right-8">
            {fill(text.badge, kit.winners)}
          </span>
          <p className="m-0 mb-4 font-sans text-label font-black uppercase text-content-muted">{text.contents}</p>

          {/* One column on a phone, so it reads as a checklist; three-and-two
              on a tablet (six columns, spans of 2 and 3), so no card is left
              alone on a row; all five across on a desktop. */}
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-6 lg:grid-cols-5 lg:gap-4">
            {kit.items.map((item, i) => (
              <li
                key={item.name}
                className={`relative flex items-center gap-4 rounded-xl border border-edge bg-surface-raised py-4 pl-4 pr-14 sm:flex-col sm:items-start sm:gap-3.5 sm:px-5 sm:py-6 ${
                  i < 3 ? "sm:col-span-2" : "sm:col-span-3"
                } lg:col-span-1`}
              >
                {item.photo ? (
                  <Image
                    src={item.photo}
                    alt=""
                    width={128}
                    height={128}
                    className="h-14 w-14 flex-none rounded-full object-cover sm:h-16 sm:w-16"
                  />
                ) : (
                  <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-surface-accent text-content sm:h-16 sm:w-16">
                    <GiveawayIcon name={item.icon} size={28} />
                  </span>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-sans text-[17px] font-bold leading-[1.3] text-content">{item.name}</span>
                  <span className="font-sans text-small leading-[1.45] text-content-muted">{item.line}</span>
                </div>
                {/* "Included", where the old design numbered the prizes. */}
                <span
                  className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-content sm:right-3.5 sm:top-3.5 sm:translate-y-0"
                  aria-hidden
                >
                  <GiveawayIcon name="check" size={14} stroke={3} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function CloserSection() {
  const { giveaway, closed } = useGiveaway();
  const { closer, closed: closedCopy } = giveaway.copy;

  return (
    <section className="relative overflow-hidden bg-surface-inverse py-16 text-content-inverse lg:py-28">
      <div className="relative mx-auto flex w-full max-w-[860px] flex-col items-center gap-6 px-5 text-center sm:px-10">
        <Image src="/logo/logo-house-amber.png" alt="" width={96} height={96} className="h-auto w-12" />
        <h2 className="text-[clamp(34px,5.4vw,64px)] leading-[1.08] text-content-inverse">
          <RichText>{closer.headline}</RichText>
        </h2>
        <a href="#enter" onClick={goToEntry} className={`${PILL} min-h-[58px] px-9 text-[17px]`}>
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
