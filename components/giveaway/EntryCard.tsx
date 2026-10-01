"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
// From the types module, not the registry: the registry imports every
// giveaway's full settings, and a client component that pulls it in ships
// those settings — routing rules, internal tags — to the browser.
import { ANSWER_LABEL, LISTING_ANSWERS, NOT_LISTED, type ListingAnswer } from "@/config/giveaways/types";
import { MARKETS } from "@/config/markets";
import { captureAttribution, getFirstTouch, getStoredUtms } from "@/lib/analytics";
import { deriveChannel } from "@/lib/channels";
import { trackEvent } from "@/lib/events";
import { RichText } from "@/components/campaign/RichText";
import { calendlyIframeSrc, readCalendlyMessage } from "./calendly";
import { markFormEngaged, useGiveaway } from "./GiveawayShell";
import { GiveawayIcon } from "./icons";
import { trackGiveaway } from "./track";

// ─────────────────────────────────────────────────────────────────────────────
// THE ENTRY CARD — the form, its confirmation, and the booking that earns the
// bonus entries, all in one card that never navigates.
//
// It stays in place because the people using it are standing at a booth on
// conference Wi-Fi: every page load is a chance to lose them, and the
// confirmation IS the next call to action.
//
// ── What it shares with FormCard, and what it does not ──────────────────────
// Shared, by importing the same functions: attribution capture before the URL
// strip (the ORDER in the mount effect is load-bearing, exactly as there), the
// channel rule, the first-touch read, and the referral-source convention
// (a `referral_source_id` in the URL beats the page's default).
//
// Not shared: the fields, the endpoint and what happens afterwards. FormCard
// cannot grow a market dropdown and a 90-day question without changing the
// form /exp and /lp/sell convert on, and it posts to /api/lead, where every
// submission becomes a deal. This posts to /api/giveaway/enter, where most
// submissions do not.
//
// ── Attribution defaults are NOT applied here ───────────────────────────────
// The form sends what it captured, even when that is nothing; the server
// applies the page's defaults (lib/giveaway/service.ts). The one local use of
// the default is the analytics event's `channel`, which has to agree with what
// the server will store.
// ─────────────────────────────────────────────────────────────────────────────

/** What survives a reload, so the confirmation — and the booking that hangs
 *  off it — is still there if the tab is refreshed or backgrounded. Session
 *  storage: gone when the tab closes, never sent anywhere. */
type Saved = {
  entryId: string;
  name: string;
  email: string;
  phone: string;
  marketSlug: string | null;
  inEntryPeriod: boolean;
  created: boolean;
  entries: number;
  booked: boolean;
};

type Manager = {
  name: string;
  firstName: string;
  title: string;
  photo: string | null;
  calendlyUrl: string | null;
};

type FieldKey = "name" | "email" | "phone" | "market" | "zip" | "listing90";

const ERROR_TEXT: Record<FieldKey, string> = {
  name: "Please add your name.",
  email: "Please add a valid email.",
  phone: "Please add your phone number.",
  market: "Please choose your market.",
  zip: "Please enter your 5-digit ZIP.",
  listing90: "Please choose one.",
};

const PRIVACY_URL = "https://curbio.com/privacy-policy";

// Alphabetical, unlike the market picker's interleaved order: this is a list
// someone scans for their own city, not a set of cards.
const MARKET_OPTIONS = [...MARKETS]
  .sort((a, b) => a.displayName.localeCompare(b.displayName))
  .map((m) => ({ slug: m.slug, label: `${m.displayName} — ${m.coverage}` }));

// Border and fill live in the OK/BAD halves, never in the shared base: two
// utilities for the same property on one element are settled by stylesheet
// order, not by which is written last, and the error fill was losing.
const INPUT = "block h-14 w-full rounded-lg px-4 font-sans text-[17px] text-content placeholder:text-content-subtle";
const INPUT_OK = "border-[1.5px] border-edge-strong bg-surface-raised";
const INPUT_BAD = "border-2 border-accent-active bg-accent-subtle";
const LABEL = "font-sans text-small font-bold text-content";

function storageKey(slug: string): string {
  return `curbio_giveaway:${slug}`;
}

function readSaved(slug: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function writeSaved(slug: string, saved: Saved): void {
  try {
    sessionStorage.setItem(storageKey(slug), JSON.stringify(saved));
  } catch {
    // Private mode — the confirmation simply will not survive a reload.
  }
}

export function EntryCard() {
  const { giveaway, closed } = useGiveaway();
  const copy = giveaway.copy;

  const [f, setF] = useState({ name: "", email: "", phone: "", market: "", zip: "" });
  const [listing, setListing] = useState<ListingAnswer | null>(null);
  const [errs, setErrs] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [saved, setSaved] = useState<Saved | null>(null);
  const [view, setView] = useState<"form" | "thanks" | "booking">("form");
  const [manager, setManager] = useState<Manager | null>(null);
  const [burst, setBurst] = useState(0);

  const renderedAtRef = useRef(0);
  const refIdRef = useRef<string>(giveaway.attribution.referralSourceId);
  const formStartFired = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    renderedAtRef.current = Date.now();
    // ORDER IS LOAD-BEARING (same as FormCard): captureAttribution() reads
    // utm_* from the live URL, persists them and queues the GA4 page_view —
    // synchronously — BEFORE the strip below wipes the query string.
    captureAttribution();
    const params = new URLSearchParams(window.location.search);
    const urlRefId = params.get("referral_source_id");
    if (urlRefId) refIdRef.current = urlRefId;
    window.history.replaceState({}, "", window.location.pathname);

    const previous = readSaved(giveaway.slug);
    if (previous) {
      setSaved(previous);
      setView("thanks");
    }
  }, [giveaway.slug]);

  // Who the local manager is. Asked for only once an entry exists, so a slow
  // operator API can hold up the booking card and nothing before it.
  const marketSlug = saved?.marketSlug ?? null;
  useEffect(() => {
    if (!marketSlug) return;
    let cancelled = false;
    fetch(`/api/giveaway/manager?market=${encodeURIComponent(marketSlug)}`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.manager) setManager(data.manager as Manager);
      })
      .catch(() => {
        // No manager, no calendar: the card falls back to the booth route.
      });
    return () => {
      cancelled = true;
    };
  }, [marketSlug]);

  const onFocus = useCallback(() => {
    markFormEngaged();
    if (formStartFired.current) return;
    formStartFired.current = true;
    trackEvent("form_start", { form_id: `giveaway-${giveaway.slug}`, market: "unknown", variant: "control" });
  }, [giveaway.slug]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setErrs((p) => ({ ...p, [k]: false }));
  };

  const notListed = f.market === NOT_LISTED;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    const next: Partial<Record<FieldKey, boolean>> = {
      name: !f.name.trim(),
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()),
      phone: f.phone.replace(/\D/g, "").length < 10,
      market: !f.market,
      zip: notListed && f.zip.replace(/\D/g, "").length !== 5,
      listing90: !listing,
    };
    if (Object.values(next).some(Boolean)) {
      setErrs(next);
      // Bring the first problem into view — on a phone it is usually above the
      // button the visitor just tapped.
      const first = (Object.keys(next) as FieldKey[]).find((k) => next[k]);
      if (first) document.getElementById(`gw-${first}`)?.focus();
      return;
    }

    setPending(true);
    setErrs({});
    setServerError(null);

    const utms = getStoredUtms();
    const firstTouch = getFirstTouch();
    try {
      const res = await fetch("/api/giveaway/enter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          giveaway: giveaway.slug,
          name: f.name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim(),
          market: f.market,
          zip: notListed ? f.zip.replace(/\D/g, "").slice(0, 5) : "",
          listing90: listing,
          referralSourceId: refIdRef.current,
          firstTouchChannel: firstTouch?.channel ?? null,
          firstTouchCampaign: firstTouch?.campaign ?? null,
          submittedAt: new Date().toISOString(),
          renderedAt: renderedAtRef.current,
          ...utms,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (Array.isArray(data.fields) && data.fields.length) {
          setErrs(Object.fromEntries((data.fields as FieldKey[]).map((k) => [k, true])));
          return;
        }
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      const done: Saved = {
        entryId: data.entryId,
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        marketSlug: data.marketSlug ?? null,
        inEntryPeriod: !!data.inEntryPeriod,
        created: !!data.created,
        entries: Number(data.entries) || 1,
        booked: false,
      };
      writeSaved(giveaway.slug, done);
      setSaved(done);
      setView("thanks");
      setBurst((n) => n + 1);
      cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });

      setTimeout(() => {
        trackGiveaway("giveaway_entry", {
          giveaway: giveaway.slug,
          market: done.marketSlug ?? NOT_LISTED,
          listing90: listing,
          // The server stores the page default when no utm_source arrived;
          // this mirrors it so the event and the entry agree on the channel.
          channel: deriveChannel(utms.utm_source?.trim() || giveaway.attribution.defaultUtmSource),
          referral_source_id: refIdRef.current,
        });
      }, 0);
    } catch (err) {
      const offline = err instanceof TypeError || (err instanceof DOMException && err.name === "TimeoutError");
      setServerError(
        offline
          ? "We couldn't reach the server. Check your connection and tap again — you won't be entered twice."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
      );
    } finally {
      setPending(false);
    }
  }

  // ── Booking ────────────────────────────────────────────────────────────────
  const [calHeight, setCalHeight] = useState(680);
  const [bookingNote, setBookingNote] = useState<string | null>(null);

  const reportBooking = useCallback(
    async (eventUri: string | null) => {
      if (!saved) return;
      // Calendly has confirmed, so the call IS booked: show that at once and
      // let our own record catch up behind it.
      const booked: Saved = {
        ...saved,
        booked: true,
        entries: saved.inEntryPeriod ? 1 + giveaway.bonusEntries : saved.entries,
      };
      writeSaved(giveaway.slug, booked);
      setSaved(booked);

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch("/api/giveaway/booked", {
            method: "POST",
            headers: { "content-type": "application/json" },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({ giveaway: giveaway.slug, entryId: saved.entryId, eventUri }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            const confirmed = { ...booked, entries: Number(data.entries) || booked.entries };
            writeSaved(giveaway.slug, confirmed);
            setSaved(confirmed);
            return;
          }
        } catch {
          // fall through to the retry
        }
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      // Only OUR record of the booking failed. Say so plainly, and give them
      // the route to the same entries that does not depend on this request.
      if (saved.inEntryPeriod) {
        setBookingNote(
          `Your call is booked. We couldn't add your bonus entries automatically — show this screen at Booth #${giveaway.event.booth} and we'll add them.`
        );
      }
    },
    [saved, giveaway.slug, giveaway.event.booth, giveaway.bonusEntries]
  );

  useEffect(() => {
    if (view !== "booking") return;
    function onMessage(e: MessageEvent) {
      const msg = readCalendlyMessage(e);
      if (!msg) return;
      if (msg.kind === "height") {
        setCalHeight(msg.height);
      } else {
        trackEvent("booking_complete", { market: marketSlug ?? "unknown", form_id: `giveaway-${giveaway.slug}` });
        trackGiveaway("giveaway_booking", { giveaway: giveaway.slug, market: marketSlug ?? NOT_LISTED });
        setView("thanks");
        setBurst((n) => n + 1);
        void reportBooking(msg.eventUri);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [view, marketSlug, giveaway.slug, reportBooking]);

  const iframeSrc = useMemo(() => {
    if (view !== "booking" || !manager?.calendlyUrl || !saved) return null;
    return calendlyIframeSrc(
      manager.calendlyUrl,
      giveaway.booking.eventSlug,
      { name: saved.name, email: saved.email, phone: saved.phone },
      window.location.host
    );
  }, [view, manager, saved, giveaway.booking.eventSlug]);

  function openBooking() {
    setView("booking");
    trackEvent("booking_view", { market: marketSlug ?? "unknown", form_id: `giveaway-${giveaway.slug}` });
    cardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /** Back to an empty form. For a phone handed to a colleague: without this
   *  the second person would find the first one's confirmation and no way to
   *  enter. Re-entering with the SAME email is not a second entry — the
   *  server updates the existing one. */
  function startOver() {
    try {
      sessionStorage.removeItem(storageKey(giveaway.slug));
    } catch {
      // nothing to clear
    }
    setSaved(null);
    setManager(null);
    setBookingNote(null);
    setF({ name: "", email: "", phone: "", market: "", zip: "" });
    setListing(null);
    setView("form");
  }

  // The server's verdict on the entry, once there is one; the clock until then.
  const inDrawing = saved ? saved.inEntryPeriod : !closed;
  const firstName = saved?.name.split(/\s+/)[0] ?? "";

  return (
    <div
      ref={cardRef}
      id="enter"
      className="relative w-full rounded-xl bg-surface-raised shadow-[0_2px_4px_rgba(13,37,77,0.06),0_24px_48px_rgba(13,37,77,0.14)]"
    >
      {view === "form" && (
        <form onSubmit={submit} onFocusCapture={onFocus} noValidate>
          <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-8 sm:pb-[22px] sm:pt-6">
            <div className="flex flex-col gap-1.5">
              <p className="m-0 font-sans text-label font-black uppercase text-state-info">
                {closed ? copy.closed.formEyebrow : copy.form.eyebrow}
              </p>
              <h2 className="text-[26px] leading-[1.15] sm:text-[30px]">
                {closed ? copy.closed.formTitle : copy.form.title}
              </h2>
              {/* On a phone the open form's "takes 20 seconds" line repeats the
                  sentence directly above the card, and costs a row of height
                  exactly where the cookie notice sits on a first visit. With
                  it gone the Name field clears the notice on an iPhone. */}
              <p className={`m-0 font-sans text-small text-content-muted${closed ? "" : " hidden sm:block"}`}>
                {closed ? copy.closed.formSub : copy.form.sub}
              </p>
            </div>
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-accent text-content sm:h-14 sm:w-14">
              <GiveawayIcon name="ticket" size={26} />
            </span>
          </div>
          <div className="gw-perforation" aria-hidden>
            <span />
          </div>

          <div className="flex flex-col gap-4 px-5 pb-7 pt-[18px] sm:px-8">
            <Field id="gw-name" label="Name" error={errs.name ? ERROR_TEXT.name : null}>
              <input
                id="gw-name"
                className={`${INPUT} ${errs.name ? INPUT_BAD : INPUT_OK}`}
                type="text"
                autoComplete="name"
                placeholder="First and last name"
                value={f.name}
                onChange={set("name")}
                aria-required
                aria-invalid={!!errs.name}
                aria-describedby={errs.name ? "gw-name-err" : undefined}
              />
            </Field>
            <Field id="gw-email" label="Email" error={errs.email ? ERROR_TEXT.email : null}>
              <input
                id="gw-email"
                className={`${INPUT} ${errs.email ? INPUT_BAD : INPUT_OK}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="you@exprealty.com"
                value={f.email}
                onChange={set("email")}
                aria-required
                aria-invalid={!!errs.email}
                aria-describedby={errs.email ? "gw-email-err" : undefined}
              />
            </Field>
            <Field id="gw-phone" label="Phone" error={errs.phone ? ERROR_TEXT.phone : null}>
              <input
                id="gw-phone"
                className={`${INPUT} ${errs.phone ? INPUT_BAD : INPUT_OK}`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(555) 555-5555"
                value={f.phone}
                onChange={set("phone")}
                aria-required
                aria-invalid={!!errs.phone}
                aria-describedby={errs.phone ? "gw-phone-err" : undefined}
              />
            </Field>
            <Field id="gw-market" label="Market" error={errs.market ? ERROR_TEXT.market : null}>
              <select
                id="gw-market"
                className={`gw-select ${INPUT} ${errs.market ? INPUT_BAD : INPUT_OK} ${f.market ? "" : "text-content-muted"}`}
                value={f.market}
                onChange={set("market")}
                aria-required
                aria-invalid={!!errs.market}
                aria-describedby={errs.market ? "gw-market-err" : undefined}
              >
                <option value="">Select your market</option>
                {MARKET_OPTIONS.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.label}
                  </option>
                ))}
                <option value={NOT_LISTED}>My market isn&apos;t listed</option>
              </select>
            </Field>
            {notListed && (
              <Field id="gw-zip" label="Your ZIP code" error={errs.zip ? ERROR_TEXT.zip : null}>
                <input
                  id="gw-zip"
                  className={`${INPUT} ${errs.zip ? INPUT_BAD : INPUT_OK}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={10}
                  placeholder="ZIP code"
                  value={f.zip}
                  onChange={set("zip")}
                  aria-required
                  aria-invalid={!!errs.zip}
                  aria-describedby={errs.zip ? "gw-zip-err" : "gw-zip-hint"}
                />
                {!errs.zip && (
                  <p id="gw-zip-hint" className="m-0 font-sans text-[13px] text-content-muted">
                    So we can tell you when Curbio reaches your area.
                  </p>
                )}
              </Field>
            )}

            <ListingQuestion
              value={listing}
              error={!!errs.listing90}
              onPick={(v) => {
                setListing(v);
                setErrs((p) => ({ ...p, listing90: false }));
              }}
            />

            {serverError && (
              <p role="alert" className="m-0 rounded-lg bg-accent-subtle px-4 py-3 font-sans text-small font-semibold text-content">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="mt-1.5 flex min-h-[58px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 bg-accent font-sans text-[17px] font-black text-content transition-[background-color,box-shadow] duration-base ease-out hover:bg-accent-hover hover:shadow-accent disabled:cursor-default disabled:opacity-70"
            >
              {pending ? (
                <>
                  <span className="gw-spin h-4 w-4 rounded-full border-2 border-content border-t-transparent" aria-hidden />
                  {copy.form.pending}
                </>
              ) : (
                <>
                  {closed ? copy.closed.submit : copy.form.submit}
                  <GiveawayIcon name="arrow" size={18} stroke={2.25} />
                </>
              )}
            </button>

            {/* The email line stands on its own, directly under the button —
                it is a consent a visitor should not have to find. */}
            <p className="m-0 font-sans text-[13px] font-semibold leading-[1.5] text-content">{copy.form.emailOptIn}</p>
            <p className="m-0 font-sans text-label font-normal normal-case leading-[1.55] tracking-normal text-content-muted">
              {!closed && (
                <>
                  No purchase necessary. Must be {giveaway.rules.minAge}+. See{" "}
                  <a href={giveaway.rules.path} className="text-content underline">
                    Official Rules
                  </a>
                  .{" "}
                </>
              )}
              By {closed ? "submitting" : "entering"}, you agree to our{" "}
              <a href={PRIVACY_URL} target="_blank" rel="noreferrer noopener" className="text-content underline">
                Privacy Policy
              </a>{" "}
              and consent to calls and texts from Curbio. Reply STOP to opt out.
            </p>
          </div>
        </form>
      )}

      {view === "thanks" && saved && (
        <div role="status" className="gw-rise relative flex flex-col gap-[22px] overflow-hidden p-6 sm:p-9">
          <Burst key={burst} />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-content">
            <GiveawayIcon name={saved.booked ? "calendar" : "check"} size={30} stroke={2.25} />
          </span>

          <div className="relative flex flex-col gap-2.5">
            <p className="m-0 font-sans text-label font-black uppercase text-state-info">
              {saved.booked ? "Booked" : inDrawing ? copy.thanks.eyebrow : "Received"}
            </p>
            <h2 className="text-[clamp(38px,5vw,52px)] leading-[1.05]">
              <RichText>{inDrawing ? copy.thanks.headline : copy.closed.thanksHeadline}</RichText>
            </h2>
            <p className="m-0 font-sans text-body text-content-muted">
              {inDrawing ? copy.thanks.body : copy.closed.thanksBody}
            </p>
            {inDrawing && !saved.created && !saved.booked && (
              <p className="m-0 font-sans text-small font-semibold text-content">{copy.thanks.updated}</p>
            )}
          </div>

          {saved.booked ? (
            <div className="relative flex flex-col gap-2 rounded-[16px] bg-surface-accent p-[22px]">
              {inDrawing && (
                <span className="self-start rounded-full bg-brand px-3 py-1.5 font-sans text-label font-black text-content-inverse">
                  {saved.entries} ENTRIES
                </span>
              )}
              <p className="m-0 font-serif text-[22px] font-semibold leading-[1.25] text-content">
                {inDrawing ? copy.thanks.booked : "Your call is booked."}
              </p>
              <p className="m-0 font-sans text-body text-content">
                {bookingNote ??
                  `${manager?.firstName ?? "Your local manager"} will call at the time you picked. A confirmation is on its way to ${saved.email}.`}
              </p>
            </div>
          ) : saved.marketSlug ? (
            <div className="relative flex flex-col gap-3.5 rounded-[16px] border-2 border-accent bg-accent-subtle p-[22px]">
              {inDrawing && (
                <span className="self-start rounded-full bg-brand px-3 py-1.5 font-sans text-label font-black text-content-inverse">
                  +{giveaway.bonusEntries} ENTRIES
                </span>
              )}
              <p className="m-0 font-serif text-[24px] font-semibold leading-[1.25] text-content">
                {inDrawing ? copy.thanks.bonusHeadline : "Want to talk sooner?"}
              </p>
              {manager ? (
                <div className="flex items-center gap-3">
                  {manager.photo && (
                    <Image
                      src={manager.photo}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 flex-none rounded-full object-cover object-top"
                    />
                  )}
                  <p className="m-0 font-sans text-body text-content">
                    Book {giveaway.booking.minutes} minutes with <strong>{manager.name}</strong>, your local Curbio
                    manager.
                  </p>
                </div>
              ) : (
                <p className="m-0 font-sans text-body text-content">{copy.thanks.bonusBody}</p>
              )}
              {manager?.calendlyUrl && (
                <button
                  type="button"
                  onClick={openBooking}
                  className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 bg-accent font-sans text-[17px] font-black text-content transition-[background-color,box-shadow] duration-base ease-out hover:bg-accent-hover hover:shadow-accent"
                >
                  {inDrawing ? copy.thanks.bonusCta : copy.closed.bookingCta}
                  <GiveawayIcon name="arrow" size={18} stroke={2.25} />
                </button>
              )}
              {inDrawing && (
                <p className="m-0 font-sans text-small text-content">{copy.thanks.bonusAlternative}</p>
              )}
            </div>
          ) : (
            <div className="relative flex flex-col gap-3 rounded-[16px] bg-surface-accent p-[22px]">
              {inDrawing && (
                <span className="self-start rounded-full bg-brand px-3 py-1.5 font-sans text-label font-black text-content-inverse">
                  +{giveaway.bonusEntries} ENTRIES
                </span>
              )}
              <p className="m-0 font-sans text-body text-content">
                {inDrawing
                  ? copy.thanks.notListed
                  : "We're not in your market yet, and we'll let you know when we are."}
              </p>
            </div>
          )}

          <p className="relative m-0 font-sans text-[13px] text-content-muted">
            {inDrawing ? "Entered" : "Sent"} as {firstName} · {saved.email}.{" "}
            <button
              type="button"
              onClick={startOver}
              className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[13px] font-semibold text-content underline underline-offset-[3px]"
            >
              Not you?
            </button>
          </p>
        </div>
      )}

      {view === "booking" && saved && manager && (
        <div className="gw-rise flex flex-col gap-4 p-5 sm:p-7">
          <button
            type="button"
            onClick={() => setView("thanks")}
            className="flex cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent p-0 font-sans text-small font-semibold text-content underline underline-offset-[3px]"
          >
            <GiveawayIcon name="back" size={16} stroke={2} />
            Back
          </button>
          <div className="flex items-center gap-3">
            {manager.photo && (
              <Image
                src={manager.photo}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 flex-none rounded-full object-cover object-top"
              />
            )}
            <div>
              <h2 className="text-[22px] leading-[1.2]">
                {giveaway.booking.minutes} minutes with {manager.firstName}
              </h2>
              <p className="m-0 font-sans text-small text-content-muted">
                {manager.name} · {manager.title}
              </p>
            </div>
          </div>
          {inDrawing && (
            <p className="m-0 rounded-lg bg-accent-subtle px-4 py-3 font-sans text-small font-semibold text-content">
              Your {giveaway.bonusEntries} bonus entries are added the moment the booking is confirmed.
            </p>
          )}
          {iframeSrc && (
            <iframe
              src={iframeSrc}
              title={`Schedule a call with ${manager.firstName}`}
              width="100%"
              height={calHeight}
              className="block w-full rounded-md border-0"
            />
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {label} <span className="text-accent-active">*</span>
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="m-0 font-sans text-[13px] font-semibold text-accent-active">
          {error}
        </p>
      )}
    </div>
  );
}

/** Three tap targets rather than a dropdown: one thumb, no keyboard. A real
 *  radio group underneath — arrow keys move, space and enter select. */
function ListingQuestion({
  value,
  error,
  onPick,
}: {
  value: ListingAnswer | null;
  error: boolean;
  onPick: (v: ListingAnswer) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + LISTING_ANSWERS.length) % LISTING_ANSWERS.length;
    onPick(LISTING_ANSWERS[next]);
    refs.current[next]?.focus();
  }
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className={`${LABEL} mb-2 p-0`}>
        Listing in the next 90 days? <span className="text-accent-active">*</span>
      </legend>
      <div
        role="radiogroup"
        aria-required
        aria-invalid={error}
        aria-describedby={error ? "gw-listing90-err" : undefined}
        className="grid grid-cols-3 gap-2"
      >
        {LISTING_ANSWERS.map((answer, i) => {
          const on = value === answer;
          return (
            <button
              key={answer}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={i === 0 ? "gw-listing90" : undefined}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (!value && i === 0) ? 0 : -1}
              onClick={() => onPick(answer)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`min-h-14 cursor-pointer rounded-lg font-sans text-body font-bold transition-colors duration-base ease-out ${
                on
                  ? "border-2 border-brand bg-brand text-content-inverse"
                  : error
                    ? "border-2 border-accent-active bg-accent-subtle text-content"
                    : "border-[1.5px] border-edge-strong bg-surface-raised text-content"
              }`}
            >
              {ANSWER_LABEL[answer]}
            </button>
          );
        })}
      </div>
      {error && (
        <p id="gw-listing90-err" role="alert" className="m-0 mt-1.5 font-sans text-[13px] font-semibold text-accent-active">
          {ERROR_TEXT.listing90}
        </p>
      )}
    </fieldset>
  );
}

// ── Confetti burst ───────────────────────────────────────────────────────────
// Generated once from a fixed seed, so the server and the client would agree
// on every piece if this were ever rendered on both. It is not — it only
// mounts after a submit — but a seeded list also means the burst looks the
// same every time rather than occasionally clumping.
const BURST_COLORS = ["var(--amber)", "var(--amber-30)", "var(--teal)", "var(--sage)", "var(--navy)", "var(--stone)"];
const BURST_PIECES = (() => {
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: 34 }, (_, i) => {
    const angle = rnd() * Math.PI * 2;
    const distance = 140 + rnd() * 220;
    return {
      color: BURST_COLORS[i % BURST_COLORS.length],
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance * 0.8 + 120,
      rot: Math.floor(rnd() * 720 - 360),
      w: 6 + rnd() * 6,
      h: rnd() > 0.5 ? 6 + rnd() * 4 : 12 + rnd() * 8,
      round: rnd() > 0.7,
      delay: rnd() * 120,
    };
  });
})();

function Burst() {
  return (
    <div className="gw-burst" aria-hidden>
      {BURST_PIECES.map((p, i) => (
        <span
          key={i}
          style={
            {
              left: -p.w / 2,
              top: -p.h / 2,
              width: p.w,
              height: p.h,
              background: p.color,
              borderRadius: p.round ? 999 : 2,
              "--gw-dx": `${p.dx}px`,
              "--gw-dy": `${p.dy}px`,
              "--gw-rot": `${p.rot}deg`,
              "--gw-delay": `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
