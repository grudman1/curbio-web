"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MARKET_CARDS, type ResolvedMarket } from "@/lib/markets";
import { Modal, Eyebrow, PillButton, Field, Icon, SuccessPanel } from "./LpKit";

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
  current: ResolvedMarket | null;
}) {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [err, setErr] = useState("");

  function go(slug: string) {
    onClose();
    router.push(`/?market=${slug}`);
  }

  function submitZip() {
    const digits = zip.replace(/\D/g, "").slice(0, 5);
    if (digits.length !== 5) {
      setErr("Enter a valid 5-digit ZIP code.");
      return;
    }
    setErr("");
    onClose();
    router.push(`/?zip=${digits}`);
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
              <span className="lp-mkt-region">{m.region}</span>
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
  const [f, setF] = useState({ name: "", zip: "", email: "", description: "" });
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.name.trim() && f.zip.replace(/\D/g, "").length === 5 && isValidEmail(f.email);

  const close = () => {
    setSent(false);
    setPending(false);
    setServerErr(null);
    setF({ name: "", zip: "", email: "", description: "" });
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
          zip: f.zip.replace(/\D/g, "").slice(0, 5),
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
              label="Property ZIP"
              value={f.zip}
              onChange={set("zip")}
              required
              half
              inputMode="numeric"
              maxLength={5}
              placeholder="20817"
            />
            <Field label="Email" type="email" value={f.email} onChange={set("email")} required />
            <Field
              label="What do you need? (optional)"
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
                background: "var(--amber-10)",
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
        <SuccessPanel
          title="Request received"
          body={
            <span>
              {market ? `${market.hsm.name} will` : "Your local Curbio team will"} reach out within one business
              day to schedule your walkthrough. Keep an eye on{" "}
              <strong style={{ color: "var(--navy)" }}>{f.email || "your inbox"}</strong>.
            </span>
          }
          onClose={close}
        />
      )}
    </Modal>
  );
}
