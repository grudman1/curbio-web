"use client";

import { RichText } from "@/components/campaign/RichText";
import { Countdown } from "./Countdown";
import { EntryCard } from "./EntryCard";
import { useGiveaway } from "./GiveawayShell";
import { GiveawayIcon } from "./icons";

// ─────────────────────────────────────────────────────────────────────────────
// The hero: headline on the left, the entry card on the right, the countdown
// and event details underneath the headline.
//
// ── The order on a phone is the point ───────────────────────────────────────
// The people using this page scanned a QR code at a booth. In the approved
// design the form came after the headline, the countdown AND both detail
// cards — more than a screen down, on a page whose own copy says "enter in 20
// seconds". So the DOM order is headline → form → countdown → details, and on
// a wide screen CSS grid lifts the form into the right-hand column beside all
// three. One order in the markup, two layouts, no duplicated form.
//
// `grid-rows-[auto_1fr]` matters on desktop: the card spans both rows and is
// taller than the copy, and without it the browser would share the extra
// height between the rows and push the countdown away from the headline.
//
// ── The headline's size is worked out, not guessed ──────────────────────────
// "Listing-Ready Kit" cannot break across lines (a half-amber headline reads as
// two emphases, and the hyphen would strand half a word), and it is 8.15 × the
// font size wide in Lora 600. So the size is whatever lets that phrase fit the
// room it has:
//   phone / tablet   10.4vw — 33px on a 320 screen, 41px on a 390, capped at 84
//   desktop          the left column is (viewport − 624px) wide, because the
//                    form takes 480px, the gutter 64px and the page margins
//                    80px; (that ÷ 8.4) leaves a little air, capped at 68
// Re-measure if the headline's words change.
//
// ── The three cards stack ───────────────────────────────────────────────────
// Countdown, Rick and the booth are one column at every width. Side by side
// they were two ~270px cards, and Rick's line (name, title, day, time, stage)
// does not fit that without squeezing.
// ─────────────────────────────────────────────────────────────────────────────

export function GiveawayHero() {
  const { giveaway, closed, inPerson } = useGiveaway();
  const { copy, event, stage } = giveaway;
  // Names, titles and "11:30am MT" never break in the middle: on a 320px phone
  // a balanced wrap would otherwise put "Rick" and "Rudman" on different lines.
  const tight = (text: string) => text.replace(/ /g, "\u00a0");
  const when = [stage.day, stage.time && tight(stage.time)].filter(Boolean).join(" · ");

  return (
    <section className="relative overflow-hidden bg-surface pb-12 pt-4 sm:pt-9 lg:pb-24 lg:pt-20">
      <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-x-16 gap-y-5 px-5 sm:gap-y-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:grid-rows-[auto_1fr] lg:px-10">
        <div className="flex min-w-0 flex-col gap-3 sm:gap-3.5 lg:gap-6">
          <p className="m-0 hidden items-center gap-2 self-start rounded-full border border-edge bg-surface-raised py-2 pl-2.5 pr-3.5 font-sans text-label font-black uppercase text-content shadow-raised sm:inline-flex">
            <GiveawayIcon name="pin" size={16} stroke={2} className="text-accent" />
            {copy.hero.pill}
          </p>
          <div className="flex flex-col gap-2.5 sm:gap-3 lg:gap-[18px]">
            <h1 className="text-[clamp(30px,10.4vw,84px)] leading-[1.02] tracking-[-0.02em] lg:text-[clamp(46px,calc((100vw_-_624px)/8.4),68px)] [&_em]:whitespace-nowrap">
              <RichText>{closed ? copy.closed.headline : copy.hero.headline}</RichText>
            </h1>
            <span className="block h-[3px] w-14 rounded-[2px] bg-accent" aria-hidden />
          </div>
          {closed ? (
            <p className="m-0 max-w-[540px] font-sans text-[clamp(16px,1.8vw,20px)] leading-[1.55] text-content-muted">
              {copy.closed.sub}
            </p>
          ) : (
            <div className="flex max-w-[540px] flex-col gap-1.5 sm:gap-2.5 lg:gap-3">
              <p className="m-0 font-sans text-[16px] font-semibold leading-[1.35] text-content sm:hidden">
                {copy.hero.sub.short}
              </p>
              <p className="m-0 hidden font-sans text-[clamp(18px,1.9vw,22px)] font-semibold leading-[1.4] text-content sm:block">
                {copy.hero.sub.full}
              </p>
              {/* Invisible (but taking its space, so nothing jumps) until the
                  browser has decided which version this visitor gets, then
                  faded in — so a tagged visitor never sees the booth line. */}
              <p
                className={`m-0 font-sans text-[14px] leading-[1.45] text-content-muted sm:text-[clamp(16px,1.6vw,18px)] sm:leading-[1.5] ${
                  inPerson === null ? "opacity-0" : "gw-fade"
                }`}
              >
                {inPerson === false ? copy.hero.bodyRemote : copy.hero.body}
              </p>
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-[480px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <EntryCard />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2 lg:gap-6">
          {closed ? (
            <p className="m-0 max-w-[560px] rounded-xl border border-edge bg-surface-raised px-5 py-[18px] font-sans text-small font-semibold text-content shadow-raised">
              {copy.closed.note}
            </p>
          ) : (
            <>
              <div className="flex max-w-[560px] flex-col gap-3.5 rounded-xl border border-edge bg-surface-raised px-4 py-4 shadow-[0_4px_14px_rgba(13,37,77,0.06)] sm:px-5 sm:py-[18px]">
                <span className="font-sans text-micro font-black uppercase tracking-[0.14em] text-state-info">
                  {copy.countdown.eyebrow}
                </span>
                <Countdown target={giveaway.closesAt} />
                <div className="flex flex-col gap-0.5 border-t border-edge pt-3.5 font-sans text-small leading-[1.45]">
                  <span className="font-bold text-content">{giveaway.drawing.long}</span>
                  <span className="text-content-muted">{copy.countdown.note}</span>
                </div>
              </div>

              <div className="grid max-w-[560px] grid-cols-1 gap-3">
                <Detail icon="mic" title={`Hear ${tight(stage.speaker)}, ${tight(stage.role)}`} lines={[when, stage.place]} />
                <Detail icon="house" title={`Visit us in the ${event.hall}`} lines={[`Booth #${event.booth}`]} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Detail({ icon, title, lines }: { icon: "mic" | "house"; title: string; lines: string[] }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-accent px-3.5 py-3.5 sm:gap-3.5 sm:px-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-surface-raised text-content sm:h-11 sm:w-11">
        <GiveawayIcon name={icon} size={20} />
      </span>
      <div className="min-w-0 font-sans text-small leading-[1.45]">
        <div className="text-balance font-bold text-content">{title}</div>
        {lines.map((line) => (
          <div key={line} className="text-content-muted">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
