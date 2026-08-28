"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { captureAttribution, getFirstTouch, getStoredUtms } from "@/lib/analytics";
import { trackEvent } from "@/lib/events";
import { CountUp } from "@/components/sections/CountUp";

// ─────────────────────────────────────────────────────────────────────────────
// "What is contractor-chasing costing you?" — the page's one interactive tool.
//
// It exists because the comparison section above it makes a CATEGORY argument
// and this makes a PERSONAL one: three numbers the agent already knows, and a
// figure with their own name on it. Nothing here is a claim about Curbio.
//
// ── The math, and why it is honest about being an estimate ──────────────────
//   hoursPerYear         = listings × hoursPerListing
//   commissionPerListing = avgPrice × 2.5%          (listing side)
//   hourlyValue          = commissionPerListing / 40  (dollar-productive hours
//                                                      per deal)
//   lostValue            = hoursPerYear × hourlyValue
//   lostAppointments     = round(hoursPerYear / 3)
//
// The 40 and the 3 are modelling choices, not measurements, which is what the
// fine print says out loud. The alternative — quietly presenting a model as a
// finding — is the thing that makes calculators like this untrustworthy.
//
// ── No server call until the gate ───────────────────────────────────────────
// Everything above the CTA is arithmetic in the browser. The only network
// call this component ever makes is the /api/lead POST behind "Get my full
// analysis", and it is the SAME pipeline as the hero and the closer: persist
// first, deliver second, UTM + first-touch attached.
//
// ── No CLS ──────────────────────────────────────────────────────────────────
// The results panel reserves its height (min-height in site.css) and renders
// its full copy on the server pass, so nothing below it moves when the
// figures resolve or when a slider changes their digit count.
//
// ── Motion ──────────────────────────────────────────────────────────────────
// CountUp dials the figures up on the first scroll into view. It stops being
// used the moment a slider moves: re-running an 1,100ms ease from zero on
// every drag frame would turn a flourish into a stutter, so after the first
// interaction the numbers are plain text that tracks the slider exactly.
// ─────────────────────────────────────────────────────────────────────────────

const LISTING_COMMISSION_RATE = 0.025;
const PRODUCTIVE_HOURS_PER_DEAL = 40;
const HOURS_PER_LISTING_APPOINTMENT = 3;

const DEFAULTS = { listings: 12, avgPrice: 550_000, hoursPerListing: 15 };

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Inputs = typeof DEFAULTS;

function derive({ listings, avgPrice, hoursPerListing }: Inputs) {
  const hoursPerYear = listings * hoursPerListing;
  const commissionPerListing = avgPrice * LISTING_COMMISSION_RATE;
  const hourlyValue = commissionPerListing / PRODUCTIVE_HOURS_PER_DEAL;
  const lostValue = hoursPerYear * hourlyValue;
  const lostAppointments = Math.round(hoursPerYear / HOURS_PER_LISTING_APPOINTMENT);
  return { hoursPerYear, hourlyValue, lostValue, lostAppointments };
}

export function CapacityCalculator() {
  const [v, setV] = useState<Inputs>(DEFAULTS);
  const [touched, setTouched] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", zip: "" });
  const [errs, setErrs] = useState<{ name?: string; email?: string; server?: string }>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const renderedAtRef = useRef(0);
  const gateRef = useRef<HTMLDivElement>(null);

  const { hoursPerYear, lostValue, lostAppointments } = useMemo(() => derive(v), [v]);

  useEffect(() => {
    renderedAtRef.current = Date.now();
    // Same load-bearing order as every other form on the site: capture the
    // UTMs off the live URL before anything can strip it.
    captureAttribution();
  }, []);

  const set = useCallback(
    (k: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setTouched(true);
      setV((s) => ({ ...s, [k]: Number(e.target.value) }));
    },
    []
  );

  const openGate = useCallback(() => {
    setGateOpen(true);
    trackEvent("form_start", { form_id: "capacity-calc", market: "unknown", variant: "control" });
    // Defer to the paint that renders the fields.
    requestAnimationFrame(() => gateRef.current?.querySelector("input")?.focus());
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (pending) return;

      const next: { name?: string; email?: string } = {};
      if (!f.name.trim()) next.name = "Please enter your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
        next.email = "Please enter a valid email address.";
      if (next.name || next.email) {
        setErrs(next);
        return;
      }

      setPending(true);
      setErrs({});

      const utms = getStoredUtms();
      const firstTouch = getFirstTouch();

      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: f.name.trim(),
            email: f.email.trim(),
            zip: f.zip.trim() || undefined,
            // The inputs ARE the qualifying information — an agent's own
            // production numbers are the most useful thing a manager can open
            // this lead with, so they travel in the free-text field the
            // contract already has rather than growing the payload.
            description: [
              "Capacity calculator:",
              `${v.listings} listings/yr`,
              `${usd(v.avgPrice)} avg sale price`,
              `${v.hoursPerListing} hrs of prep management per listing`,
              `→ ${hoursPerYear} hrs/yr, ~${usd(lostValue)}, ${lostAppointments} appointments.`,
            ].join(" "),
            source: "capacity-calculator",
            submittedAt: new Date().toISOString(),
            entryPoint: "web_form",
            medium: utms.utm_medium ?? null,
            firstTouchChannel: firstTouch?.channel ?? null,
            firstTouchCampaign: firstTouch?.campaign ?? null,
            renderedAt: renderedAtRef.current,
            ...utms,
            // Tag the tool's own traffic — but NEVER over a real campaign.
            // deriveChannel() maps "organic" onto the closed channel list and
            // falls back to "direct" for anything it doesn't know, so this
            // can't mint a phantom channel either way.
            utm_source: utms.utm_source ?? "organic",
            utm_campaign: utms.utm_campaign ?? "capacity-calc",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");

        setTimeout(() => {
          trackEvent("lead_submit", { market: "unknown", variant: "control" });
        }, 0);
        setSent(true);
      } catch (err) {
        setErrs({ server: err instanceof Error ? err.message : "Something went wrong." });
      } finally {
        setPending(false);
      }
    },
    [pending, f, v, hoursPerYear, lostValue, lostAppointments]
  );

  return (
    <section className="c-sect c-sect--stone" id="capacity" aria-labelledby="capacity-h">
      <div className="c-container">
        <p className="c-eyebrow">For listing agents</p>
        <h2 className="c-h2" id="capacity-h" style={{ maxWidth: "15em" }}>
          What is contractor-chasing costing you?
        </h2>
        <p className="c-lede" style={{ maxWidth: "62ch" }}>
          Three numbers in, one honest answer out: the hours and commission you&rsquo;re losing
          to project management &mdash; and what you&rsquo;d get back with Curbio on your team.
        </p>

        <div className="c-calc">
          <div className="c-calc-inputs">
            <Slider
              id="calc-listings"
              label="Listings you close per year"
              min={1}
              max={60}
              step={1}
              value={v.listings}
              display={String(v.listings)}
              onChange={set("listings")}
            />
            <Slider
              id="calc-price"
              label="Average sale price"
              min={100_000}
              max={3_000_000}
              step={25_000}
              value={v.avgPrice}
              display={usd(v.avgPrice)}
              onChange={set("avgPrice")}
            />
            <Slider
              id="calc-hours"
              label="Hours you spend managing prep per listing"
              min={1}
              max={60}
              step={1}
              value={v.hoursPerListing}
              display={`${v.hoursPerListing} hrs`}
              onChange={set("hoursPerListing")}
            />
          </div>

          <div className="c-calc-out">
            {/* Only the three sentences are live. The gate below is NOT inside
                this region: a polite announcement should say what the numbers
                became, not re-read a form every time a slider moves. */}
            <div aria-live="polite">
            <p className="c-calc-line">
              You&rsquo;re spending about{" "}
              <b>
                <Figure value={hoursPerYear} animate={!touched} />
              </b>{" "}
              hours a year acting as a general contractor.
            </p>
            <p className="c-calc-line">
              At your production, that time is worth roughly{" "}
              <b>
                <Figure value={lostValue} animate={!touched} currency />
              </b>{" "}
              in commission.
            </p>
            <p className="c-calc-line">
              That&rsquo;s{" "}
              <b>
                <Figure value={lostAppointments} animate={!touched} />
              </b>{" "}
              listing appointments you didn&rsquo;t take.
            </p>

            </div>

            <div className="c-calc-gate" ref={gateRef}>
              {sent ? (
                <p className="c-calc-done" role="status">
                  Done &mdash; your local manager will reach out. Not a call center.
                </p>
              ) : gateOpen ? (
                <form onSubmit={submit} noValidate className="c-calc-form">
                  <div className="cl2-field">
                    <label className="c-sr-only" htmlFor="calc-name">
                      Your name
                    </label>
                    <input
                      id="calc-name"
                      className="cl2-input"
                      type="text"
                      placeholder="Your name"
                      autoComplete="name"
                      value={f.name}
                      onChange={(e) => {
                        setF((s) => ({ ...s, name: e.target.value }));
                        setErrs((p) => ({ ...p, name: undefined }));
                      }}
                      aria-invalid={!!errs.name}
                    />
                    {errs.name && (
                      <span className="cl2-error" role="alert">
                        {errs.name}
                      </span>
                    )}
                  </div>
                  <div className="cl2-field">
                    <label className="c-sr-only" htmlFor="calc-email">
                      Email
                    </label>
                    <input
                      id="calc-email"
                      className="cl2-input"
                      type="email"
                      placeholder="you@brokerage.com"
                      autoComplete="email"
                      value={f.email}
                      onChange={(e) => {
                        setF((s) => ({ ...s, email: e.target.value }));
                        setErrs((p) => ({ ...p, email: undefined }));
                      }}
                      aria-invalid={!!errs.email}
                    />
                    {errs.email && (
                      <span className="cl2-error" role="alert">
                        {errs.email}
                      </span>
                    )}
                  </div>
                  <div className="cl2-field">
                    <label className="c-sr-only" htmlFor="calc-zip">
                      ZIP
                    </label>
                    <input
                      id="calc-zip"
                      className="cl2-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="ZIP"
                      autoComplete="postal-code"
                      value={f.zip}
                      onChange={(e) => setF((s) => ({ ...s, zip: e.target.value }))}
                    />
                  </div>
                  {errs.server && (
                    <p className="cl2-error" role="alert">
                      {errs.server}
                    </p>
                  )}
                  <button className="c-cta" type="submit" disabled={pending} aria-busy={pending}>
                    {pending ? "Sending…" : "Send it"}
                  </button>
                </form>
              ) : (
                <button className="c-cta" type="button" onClick={openGate}>
                  Get my full analysis <span aria-hidden="true">&rarr;</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="c-calc-fine">
          Estimates for illustration. Commission math assumes 2.5% listing side.
        </p>
      </div>
    </section>
  );
}

/**
 * One figure in the results panel. Before the first drag it dials up from zero
 * (CountUp); after it, it is plain text that tracks the slider exactly.
 *
 * Declared at module scope on purpose: as a nested arrow it would be a NEW
 * component type on every parent render, so React would unmount and remount
 * CountUp — and CountUp resets to zero on mount, which is precisely the
 * flicker this split exists to avoid.
 */
function Figure({
  value,
  animate,
  currency,
}: {
  value: number;
  animate: boolean;
  currency?: boolean;
}) {
  if (!animate) return <>{currency ? usd(value) : Math.round(value).toLocaleString("en-US")}</>;
  return <CountUp value={Math.round(value)} prefix={currency ? "$" : undefined} />;
}

function Slider({
  id,
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** Human-readable current value — shown beside the label AND used as the
   *  slider's accessible value text, so a screen reader hears "$550,000"
   *  rather than "550000". */
  display: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="c-calc-field">
      <label className="c-calc-label" htmlFor={id}>
        {label}
        <span className="c-calc-value">{display}</span>
      </label>
      <input
        id={id}
        className="c-calc-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-valuetext={display}
      />
    </div>
  );
}
