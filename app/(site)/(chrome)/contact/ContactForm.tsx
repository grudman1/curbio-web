"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureAttribution, getFirstTouch, getStoredUtms } from "@/lib/analytics";
import { trackEvent } from "@/lib/events";
import { MARKETS } from "@/config/markets";

// The contact form — posts to the EXISTING /api/lead pipeline with
// source: "contact". Read app/api/lead/route.ts's header comment before
// touching this: four separate anti-abuse mechanisms were removed from that
// route for eating real leads. Nothing here may reject a submission the
// route would accept, and nothing new goes in the payload contract.
//
// Topic is NOT a payload field (the contract doesn't have one) — it travels
// as a prefix inside `description`, which the route already passes through.
//
// Phone: /api/lead only REQUIRES phone for source:"quote". source stays
// "contact", so phone is enforced CLIENT-SIDE, and only when the topic
// implies a quote (agent / seller). General questions and brokerage
// conversations don't need a callback number to be useful.

const TOPICS = [
  { value: "general", label: "General question", phoneRequired: false },
  { value: "agent", label: "I'm an agent — quote a listing", phoneRequired: true },
  { value: "seller", label: "I'm a seller — quote my home", phoneRequired: true },
  { value: "brokerage", label: "Brokerage partnership", phoneRequired: false },
] as const;

type TopicValue = (typeof TOPICS)[number]["value"];

function topicFor(value: string | null): TopicValue {
  return (TOPICS.find((t) => t.value === value)?.value ?? "general") as TopicValue;
}

export function ContactForm() {
  const [f, setF] = useState({ name: "", email: "", phone: "", market: "", message: "" });
  const [topic, setTopic] = useState<TopicValue>("general");
  const [errs, setErrs] = useState<{ name?: string; email?: string; phone?: string; server?: string }>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const renderedAtRef = useRef(0);

  const formStartFired = useRef(false);
  const onFormFocus = useCallback(() => {
    if (formStartFired.current) return;
    formStartFired.current = true;
    trackEvent("form_start", { form_id: "contact-form", market: "unknown", variant: "control" });
  }, []);

  useEffect(() => {
    renderedAtRef.current = Date.now();
    // ORDER IS LOAD-BEARING (same as FormCard): captureAttribution() reads
    // utm_* from the live URL, persists them, and queues the GA4 page_view —
    // all synchronously — BEFORE the strip below wipes the query string.
    captureAttribution();
    // Prefill the topic from ?topic= (e.g. /contact?topic=brokerage from the
    // brokers page), read before the strip erases it.
    const params = new URLSearchParams(window.location.search);
    const urlTopic = params.get("topic");
    if (urlTopic) setTopic(topicFor(urlTopic));
    // Strip everything — utm_* is already captured, and nothing else in the
    // query is needed after mount.
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const phoneRequired = TOPICS.find((t) => t.value === topic)?.phoneRequired ?? false;

  const onChange = useCallback(
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setF((s) => ({ ...s, [k]: e.target.value }));
      setErrs((p) => ({ ...p, [k]: undefined }));
    },
    []
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (pending) return;

      const next: { name?: string; email?: string; phone?: string } = {};
      if (!f.name.trim()) next.name = "Please enter your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
        next.email = "Please enter a valid email address.";
      if (phoneRequired && f.phone.replace(/\D/g, "").length < 10)
        next.phone = "Please enter a phone number so we can reach you about the quote.";
      if (next.name || next.email || next.phone) {
        setErrs(next);
        return;
      }

      setPending(true);
      setErrs({});

      const topicLabel = TOPICS.find((t) => t.value === topic)!.label;
      const utms = getStoredUtms();
      const firstTouch = getFirstTouch();

      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: f.name.trim(),
            email: f.email.trim(),
            phone: f.phone.trim() || undefined,
            market: f.market || null,
            // Topic rides inside description — the payload contract has no
            // topic field and must not grow one here.
            description: `[${topicLabel}] ${f.message.trim()}`.trim(),
            source: "contact",
            submittedAt: new Date().toISOString(),
            entryPoint: "web_form",
            medium: utms.utm_medium ?? null,
            firstTouchChannel: firstTouch?.channel ?? null,
            firstTouchCampaign: firstTouch?.campaign ?? null,
            renderedAt: renderedAtRef.current,
            ...utms,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");

        setTimeout(() => {
          trackEvent("lead_submit", { market: f.market || "unknown", variant: "control" });
        }, 0);
        setSent(true);
      } catch (err) {
        setErrs({ server: err instanceof Error ? err.message : "Something went wrong." });
      } finally {
        setPending(false);
      }
    },
    [pending, f, topic, phoneRequired]
  );

  if (sent) {
    return (
      <div className="c-contact-success" role="status">
        <h2>Got it — thank you.</h2>
        <p>
          Your message is on its way to the manager for your market. Expect to hear from a
          person, usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form className="c-contact-form" onSubmit={submit} onFocusCapture={onFormFocus} noValidate>
      <div className="c-contact-2col">
        <div className="cl2-field">
          <label className="cl2-label" htmlFor="ct-name">Name</label>
          <input
            id="ct-name"
            className="cl2-input"
            type="text"
            value={f.name}
            onChange={onChange("name")}
            placeholder="Your name"
            autoComplete="name"
            aria-invalid={!!errs.name}
            aria-describedby={errs.name ? "ct-name-err" : undefined}
          />
          {errs.name && <span id="ct-name-err" className="cl2-error" role="alert" style={{ textAlign: "left" }}>{errs.name}</span>}
        </div>

        <div className="cl2-field">
          <label className="cl2-label" htmlFor="ct-email">Email</label>
          <input
            id="ct-email"
            className="cl2-input"
            type="email"
            value={f.email}
            onChange={onChange("email")}
            placeholder="you@brokerage.com"
            autoComplete="email"
            aria-invalid={!!errs.email}
            aria-describedby={errs.email ? "ct-email-err" : undefined}
          />
          {errs.email && <span id="ct-email-err" className="cl2-error" role="alert" style={{ textAlign: "left" }}>{errs.email}</span>}
        </div>
      </div>

      <div className="c-contact-2col">
        <div className="cl2-field">
          <label className="cl2-label" htmlFor="ct-phone">
            Phone{!phoneRequired && " (optional)"}
          </label>
          <input
            id="ct-phone"
            className="cl2-input"
            type="tel"
            inputMode="tel"
            value={f.phone}
            onChange={onChange("phone")}
            placeholder="(555) 555-5555"
            autoComplete="tel"
            aria-invalid={!!errs.phone}
            aria-describedby={errs.phone ? "ct-phone-err" : undefined}
          />
          {errs.phone && <span id="ct-phone-err" className="cl2-error" role="alert" style={{ textAlign: "left" }}>{errs.phone}</span>}
        </div>

        <div className="cl2-field">
          <label className="cl2-label" htmlFor="ct-market">Market</label>
          <select id="ct-market" className="cl2-input" value={f.market} onChange={onChange("market")}>
            <option value="">Choose a market (optional)</option>
            {MARKETS.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cl2-field">
        <label className="cl2-label" htmlFor="ct-topic">What is this about?</label>
        <select
          id="ct-topic"
          className="cl2-input"
          value={topic}
          onChange={(e) => {
            setTopic(topicFor(e.target.value));
            setErrs((p) => ({ ...p, phone: undefined }));
          }}
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="cl2-field">
        <label className="cl2-label" htmlFor="ct-message">Message</label>
        <textarea
          id="ct-message"
          className="cl2-input"
          value={f.message}
          onChange={onChange("message")}
          placeholder="The property, the timeline, or the question."
          rows={5}
        />
      </div>

      {errs.server && <p className="cl2-error" role="alert">{errs.server}</p>}

      <button className="cl2-btn" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>

      <p className="cl2-fine">
        By submitting, you agree to our{" "}
        <a href="https://curbio.com/privacy-policy" target="_blank" rel="noreferrer noopener">
          Privacy Policy
        </a>{" "}
        and consent to calls and texts from Curbio. Reply STOP to opt out.
      </p>
    </form>
  );
}
