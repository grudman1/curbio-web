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
// ─────────────────────────────────────────────────────────────────────────────

const FLOATERS: { left: string; top: string; w: number; h: number; r: number; round?: boolean; t?: number; tone: string }[] = [
  { left: "4%", top: "10%", w: 10, h: 20, r: 24, t: 6, tone: "var(--amber)" },
  { left: "46%", top: "6%", w: 12, h: 12, r: -30, round: true, tone: "var(--sage)" },
  { left: "38%", top: "88%", w: 8, h: 18, r: 40, t: 7, tone: "var(--teal)" },
  { left: "92%", top: "5%", w: 10, h: 10, r: 0, round: true, tone: "var(--amber)" },
  { left: "60%", top: "93%", w: 22, h: 6, r: -14, tone: "var(--stone)" },
  { left: "2%", top: "70%", w: 16, h: 6, r: 60, tone: "var(--sage-110)" },
  { left: "52%", top: "40%", w: 7, h: 14, r: 18, t: 8, tone: "var(--amber-30)" },
];

export function Confetti({ pieces = FLOATERS }: { pieces?: typeof FLOATERS }) {
  return (
    <div className="gw-confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          data-float={p.t ? "" : undefined}
          style={
            {
              left: p.left,
              top: p.top,
              width: p.w,
              height: p.h,
              background: p.tone,
              borderRadius: p.round ? 999 : 3,
              "--gw-r": `${p.r}deg`,
              ...(p.t ? { "--gw-t": `${p.t}s` } : {}),
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function GiveawayHero() {
  const { giveaway, closed } = useGiveaway();
  const { copy, event, stage } = giveaway;

  return (
    <section className="relative overflow-hidden bg-surface pb-12 pt-5 sm:pt-9 lg:pb-24 lg:pt-20">
      {/* Kept off small screens: there the hero is mostly form, and confetti
          drifting behind input fields is noise. */}
      {!closed && (
        <div className="hidden lg:block">
          <Confetti />
        </div>
      )}

      <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-x-16 gap-y-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:grid-rows-[auto_1fr] lg:gap-y-6 lg:px-10">
        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-6">
          <p className="m-0 hidden items-center gap-2 self-start rounded-full border border-edge bg-surface-raised py-2 pl-2.5 pr-3.5 font-sans text-label font-black uppercase text-content shadow-raised sm:inline-flex">
            <GiveawayIcon name="pin" size={16} stroke={2} className="text-accent" />
            {copy.hero.pill}
          </p>
          <div className="flex flex-col gap-3 lg:gap-[18px]">
            {/* The emphasised phrase never breaks: "Listing-Ready" is a
                hyphenated compound, and the browser will otherwise split it
                at the hyphen and strand "Ready" on the next line. */}
            <h1 className="text-[clamp(36px,7vw,84px)] leading-[1.02] tracking-[-0.02em] [&_em]:whitespace-nowrap">
              <RichText>{closed ? copy.closed.headline : copy.hero.headline}</RichText>
            </h1>
            <span className="block h-[3px] w-14 rounded-[2px] bg-accent" aria-hidden />
          </div>
          {closed ? (
            <p className="m-0 max-w-[540px] font-sans text-[clamp(16px,1.8vw,20px)] leading-[1.55] text-content-muted">
              {copy.closed.sub}
            </p>
          ) : (
            <>
              <p className="m-0 font-sans text-body leading-[1.5] text-content-muted sm:hidden">{copy.hero.sub.short}</p>
              <p className="m-0 hidden max-w-[540px] font-sans text-[clamp(17px,1.8vw,20px)] leading-[1.55] text-content-muted sm:block">
                {copy.hero.sub.full}
              </p>
            </>
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
              <div className="flex max-w-[560px] flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-edge bg-surface-raised px-5 py-[18px] shadow-[0_4px_14px_rgba(13,37,77,0.06)]">
                <Countdown target={giveaway.closesAt} />
                <div className="flex min-w-[180px] flex-1 flex-col gap-1 font-sans text-small leading-[1.45]">
                  <span className="font-sans text-micro font-black uppercase tracking-[0.14em] text-state-info">
                    {copy.countdown.eyebrow}
                  </span>
                  <span className="font-bold text-content">{giveaway.drawing.long}</span>
                  <span className="text-content-muted">{copy.countdown.note}</span>
                </div>
              </div>

              <div className="grid max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-2">
                <Detail icon="mic" title={`Hear ${stage.speaker} live`}>
                  {[stage.day, stage.place, stage.time].filter(Boolean).join(" · ")}
                </Detail>
                <Detail icon="house" title={`Visit us in the ${event.hall}`}>
                  Booth #{event.booth}
                </Detail>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Detail({ icon, title, children }: { icon: "mic" | "house"; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg bg-surface-accent px-4 py-3.5">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-surface-raised text-content">
        <GiveawayIcon name={icon} size={20} />
      </span>
      <div className="font-sans text-small leading-[1.45]">
        <div className="font-bold text-content">{title}</div>
        <div className="text-content-muted">{children}</div>
      </div>
    </div>
  );
}
