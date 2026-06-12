"use client";

import { useRouter } from "next/navigation";
import { useState, startTransition } from "react";
import { MARKET_CARDS, type ResolvedMarket } from "@/lib/markets";
import { Modal, Eyebrow, PillButton, Field, Icon } from "./LpKit";

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// ── Market chooser: pick your area (with a ZIP fallback) ──
export function ZipModal({
  open,
  onClose,
  current,
}: {
  open: boolean;
  onClose: () => void;
  /** Only the slug is needed to highlight the active card. Accepts any object
   *  with a `slug` string (ResolvedMarket, CampaignMarket, or a plain object). */
  current: { slug: string } | null;
}) {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [err, setErr] = useState("");

  function go(slug: string) {
    onClose();
    startTransition(() => { router.push(`/?market=${slug}`); });
  }

  function submitZip() {
    const digits = zip.replace(/\D/g, "").slice(0, 5);
    if (digits.length !== 5) {
      setErr("Enter a valid 5-digit ZIP code.");
      return;
    }
    setErr("");
    onClose();
    startTransition(() => { router.push(`/?zip=${digits}`); });
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={820}>
      <Eyebrow amber>Find your market</Eyebrow>
      <h2
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 25,
          fontWeight: 600,
          color: "var(--navy)",
          margin: "8px 0 5px",
          lineHeight: 1.1,
        }}
      >
        Choose your market
      </h2>
      <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: "0 0 18px", lineHeight: 1.5 }}>
        Pick your area to meet the local Curbio Home Services Manager who will handle your listing.
      </p>

      <div className="lp-mkt-grid">
        {MARKET_CARDS.map((m) => {
          const active = current?.slug === m.slug;
          return (
            <a
              key={m.slug}
              href={`/?market=${m.slug}`}
              className={"lp-mkt-card" + (active ? " active" : "")}
              onClick={(e) => {
                e.preventDefault();
                go(m.slug);
              }}
            >
              <span className="lp-mkt-av">
                {m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo} alt={m.hsmFirst} />
                ) : (
                  <span>{m.hsmFirst.charAt(0)}</span>
                )}
              </span>
              <span className="lp-mkt-name">{m.label}</span>
              {m.region ? <span className="lp-mkt-region">{m.region}</span> : null}
              {m.hsmFirst ? <span className="lp-mkt-hsm">{m.hsmFirst}</span> : null}
            </a>
          );
        })}
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--stone)" }}>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--fg-subtle)",
            marginBottom: 9,
          }}
        >
          Don&apos;t see your area? Enter your ZIP
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="lp-input"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 20817"
            value={zip}
            onChange={(e) => {
              setZip(e.target.value);
              setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submitZip()}
            style={{ flex: 1 }}
            aria-label="ZIP code"
          />
          <PillButton onClick={submitZip} icon="arrow">
            Find
          </PillButton>
        </div>
        {err && <p style={{ fontSize: 12.5, color: "var(--amber-120)", margin: "10px 0 0", lineHeight: 1.45 }}>{err}</p>}
      </div>

      {/* Persistent affordance for visitors outside all served markets */}
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "var(--fg-subtle)" }}>Outside these areas?</span>{" "}
        <button
          onClick={() => { onClose(); router.push("/?status=waitlist"); }}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--amber)",
            background: "none",
            border: 0,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Join the waitlist →
        </button>
      </div>
    </Modal>
  );
}

// ── Free quote request (low-friction: name · zip · email · optional note) ──
export function QuoteModal({
  open,
  onClose,
  market,
}: {
  open: boolean;
  onClose: () => void;
  market: ResolvedMarket | null;
}) {
  const [f, setF] = useState({ name: "", phone: "", email: "", description: "" });
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.name.trim() && f.phone.replace(/\D/g, "").length >= 10 && isValidEmail(f.email);

  const close = () => {
    setSent(false);
    setPending(false);
    setServerErr(null);
    setF({ name: "", phone: "", email: "", description: "" });
    onClose();
  };

  async function submit() {
    if (!valid || pending) return;
    setPending(true);
    setServerErr(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          phone: f.phone.trim(),
          email: f.email.trim(),
          description: f.description.trim(),
          market: market?.slug ?? null,
          source: "quote",
          submittedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setSent(true);
    } catch (e) {
      setServerErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const hsmName = market?.hsm.name ?? "Your local Home Services Manager";
  const firstName = market?.hsm.firstName ?? "";
  const calendlyUrl =
    market?.hsm.calendlyUrl && market.hsm.calendlyUrl !== "#" ? market.hsm.calendlyUrl : null;

  return (
    <Modal open={open} onClose={close} maxWidth={500}>
      {!sent ? (
        <>
          <Eyebrow amber>Free, no-obligation</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 27,
              fontWeight: 600,
              color: "var(--navy)",
              margin: "10px 0 6px",
              lineHeight: 1.08,
            }}
          >
            Get your project quote
          </h2>
          <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
            {hsmName} will scope the work and send a clear estimate — no cost, no commitment.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Name" value={f.name} onChange={set("name")} required half />
            <Field
              label="Phone"
              type="tel"
              value={f.phone}
              onChange={set("phone")}
              required
              half
              placeholder="(240) 555-0148"
            />
            <Field label="Email" type="email" value={f.email} onChange={set("email")} required />
            <Field
              label="How can we help? (optional)"
              value={f.description}
              onChange={set("description")}
              placeholder="Tell us about the listing or the work you have in mind."
              textarea
            />
          </div>
          {serverErr && (
            <p
              role="alert"
              style={{
                fontSize: 13,
                color: "var(--amber-120)",
                background: "var(--stone)",
                padding: "10px 12px",
                borderRadius: 8,
                margin: "14px 0 0",
              }}
            >
              {serverErr}
            </p>
          )}
          <div style={{ marginTop: 20 }}>
            <PillButton full size="lg" disabled={!valid || pending} onClick={submit}>
              {pending ? "Sending…" : "Request my free quote"}
            </PillButton>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--fg-subtle)", margin: "12px 0 0", textAlign: "center", lineHeight: 1.4 }}>
            No payment until your home sells. Financing for qualified sellers.
          </p>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "12px 4px 6px" }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 999,
              background: "var(--stone)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}
          >
            <Icon name="check" size={28} color="var(--amber)" stroke={2.5} />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 600,
              color: "var(--navy)",
              margin: "0 0 8px",
              lineHeight: 1.1,
            }}
          >
            Request received
          </h2>
          <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: "0 auto 22px", lineHeight: 1.55, maxWidth: 400 }}>
            {market ? market.hsm.name : "Your local Curbio team"} will reach out within one business day at{" "}
            <strong style={{ color: "var(--navy)" }}>{f.email || "your inbox"}</strong>.
            {calendlyUrl ? " Want to talk sooner? Grab a time that works for you." : ""}
          </p>
          {calendlyUrl ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340, margin: "0 auto" }}>
              <PillButton full size="lg" icon="calendar" href={calendlyUrl} target="_blank">
                Schedule a call{firstName ? ` with ${firstName}` : ""}
              </PillButton>
              <PillButton full variant="secondary" onClick={close}>
                No thanks, I&apos;ll wait
              </PillButton>
            </div>
          ) : (
            <PillButton size="lg" variant="secondary" onClick={close} style={{ minWidth: 160 }}>
              Done
            </PillButton>
          )}
        </div>
      )}
    </Modal>
  );
}
