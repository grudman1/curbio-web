"use client";

import { useState, useEffect, useRef } from "react";
import { Icon, Eyebrow, AmberRule } from "./LpKit";
import { gaEvent, getFirstTouch, getStoredUtms } from "@/lib/analytics";

export function WaitlistPage({
  zip,
  geoCity,
  geoRegion,
  onChooseMarket,
}: {
  zip: string;
  geoCity?: string;
  geoRegion?: string;
  onChooseMarket: () => void;
}) {
  const [f, setF] = useState({ name: "", email: "", zip: zip });
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  // Time-trap — same spam tripwire as FormCard; see the lead route.
  const renderedAtRef = useRef(0);
  useEffect(() => { renderedAtRef.current = Date.now(); }, []);

  useEffect(() => { setF((s) => ({ ...s, zip })); }, [zip]);

  // form_start fires once per mount, on the first focus of any field.
  const formStartFired = useRef(false);
  const onFormFocus = () => {
    if (formStartFired.current) return;
    formStartFired.current = true;
    gaEvent("form_start", { form_id: "waitlist" });
  };

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const valid = f.name.trim().length > 0 && validEmail(f.email) && f.zip.replace(/\D/g, "").length === 5;

  async function submit() {
    if (!valid || pending) return;
    setPending(true);
    setServerErr(null);
    try {
      // Same attribution model as FormCard: stored UTMs (channel is derived
      // server-side from utm_source), first-touch fields, and the geo the
      // shell already resolved — the waitlist IS the expansion-demand signal
      // detectedCity/detectedRegion exist for.
      const utms = getStoredUtms();
      const firstTouch = getFirstTouch();
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          email: f.email.trim(),
          zip: f.zip.replace(/\D/g, "").slice(0, 5),
          source: "waitlist",
          submittedAt: new Date().toISOString(),
          entryPoint: "web_form",
          medium: utms.utm_medium ?? null,
          firstTouchChannel: firstTouch?.channel ?? null,
          firstTouchCampaign: firstTouch?.campaign ?? null,
          detectedCity: geoCity,
          detectedRegion: geoRegion,
          renderedAt: renderedAtRef.current,
          ...utms,
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

  const displayZip = f.zip.replace(/\D/g, "").slice(0, 5) || zip || "your area";

  return (
    <section className="lp-waitlist">
      <div className="lp-shell lp-waitlist-inner">
        {!sent ? (
          <>
            <Eyebrow amber style={{ marginBottom: 14 }}>Coming to your area</Eyebrow>
            <h1 className="lp-waitlist-h1">
              Curbio isn&apos;t in your area <em>yet.</em>
            </h1>
            <p className="lp-waitlist-sub">
              We&apos;re expanding fast. Add your details and we&apos;ll reach out the
              moment a local Curbio team covers your area.
            </p>
            <AmberRule width={56} style={{ margin: "22px 0 26px" }} />
            <div className="lp-waitlist-fields" onFocusCapture={onFormFocus}>
              <div className="lp-fc-field">
                <label className="lp-fc-label" htmlFor="wl-name">Full name</label>
                <input
                  id="wl-name"
                  className="lp-input"
                  type="text"
                  value={f.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="lp-fc-field">
                <label className="lp-fc-label" htmlFor="wl-email">Work email</label>
                <input
                  id="wl-email"
                  className="lp-input"
                  type="email"
                  value={f.email}
                  onChange={(e) => set("email")(e.target.value)}
                  placeholder="you@brokerage.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="lp-fc-field">
                <label className="lp-fc-label" htmlFor="wl-zip">ZIP code</label>
                <input
                  id="wl-zip"
                  className="lp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={f.zip}
                  onChange={(e) => set("zip")(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="e.g. 80202"
                  required
                />
              </div>
            </div>
            {serverErr && (
              <p role="alert" className="lp-fc-server">{serverErr}</p>
            )}
            <button
              className="lp-fc-submit"
              onClick={submit}
              disabled={!valid || pending}
            >
              {pending ? "Joining…" : "Join the waitlist"}
            </button>
            <p className="lp-fc-tcpa" style={{ marginTop: 12 }}>
              By submitting you agree to receive email updates from Curbio. We never share your information.
            </p>
            <div className="lp-waitlist-alt">
              <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>Already in a Curbio market?</span>{" "}
              <button
                onClick={onChooseMarket}
                style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, color: "var(--amber)", background: "none", border: 0, cursor: "pointer", padding: 0 }}
              >
                Choose your market →
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", maxWidth: 440, margin: "0 auto", padding: "20px 0" }}>
            <div style={{ width: 62, height: 62, borderRadius: 999, background: "var(--stone)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
              <Icon name="check" size={28} color="var(--amber)" stroke={2.5} />
            </div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 600, color: "var(--navy)", margin: "0 0 12px", lineHeight: 1.1 }}>
              You&apos;re on the list.
            </h2>
            <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
              We&apos;ll let you know the moment Curbio reaches{" "}
              <strong style={{ color: "var(--navy)" }}>{displayZip}</strong>.
            </p>
            <button
              onClick={onChooseMarket}
              style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, color: "var(--amber)", background: "none", border: 0, cursor: "pointer" }}
            >
              See our current markets →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
