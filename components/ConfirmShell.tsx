"use client";

import { useEffect, useState } from "react";
import { Header } from "./LpSections";
import { ZipModal } from "./LpModals";
import { Icon } from "./LpKit";
import { gaEvent } from "@/lib/analytics";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { ResolvedMarket } from "@/lib/markets";

export type CalendlyPrefill = {
  name?: string;
  email?: string;
  /** Prefills the location phone field via the `location` param.
   *  All HSM events use location = "Phone call" (invitee provides number),
   *  so `location` is the correct prefill key — not phone_number, a1, or a2.
   *  Value is formatted as E.164: +1XXXXXXXXXX (URLSearchParams encodes + → %2B). */
  phone?: string;
};

// Build the direct Calendly iframe URL. All HSMs use the "general-meeting"
// event slug — verified via the Calendly API. Direct iframe is faster and
// more reliable than the widget script (no JS loading, no CSP issues).
function buildCalendlyIframeSrc(
  profileUrl: string,
  prefill: CalendlyPrefill = {},
  embedDomain?: string
): string {
  const base = profileUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    embed_type: "Inline",
    hide_gdpr_banner: "1",
    background_color: "ffffff",
    text_color: "0d254d",
    primary_color: "cd8629",
  });

  // REQUIRED for postMessage lifecycle events (calendly.event_scheduled etc.):
  // Calendly's iframe only notifies the parent window when embed_domain is set
  // (this is what Calendly's own widget.js appends). Without it, no events
  // fire and booking_complete can never be tracked.
  if (embedDomain) params.set("embed_domain", embedDomain);

  // Prefill params — only appended when the value is non-empty.
  // All HSM events use location = "Phone call" (invitee provides number).
  // The location field is prefilled with the `location` param in E.164 format.
  // URLSearchParams encodes + as %2B automatically — no hand-encoding needed.
  // Normalization:
  //   10 digits            → +1{digits}   (3015294344  → +13015294344)
  //   11 digits, starts 1  → +{digits}    (13015294344 → +13015294344)
  //   anything else        → omit         (partial / non-US numbers)
  if (prefill.name)  params.set("name",  prefill.name);
  if (prefill.email) params.set("email", prefill.email);
  if (prefill.phone) {
    const digits = prefill.phone.replace(/\D/g, "");
    let e164: string | null = null;
    if (digits.length === 10)                           e164 = `+1${digits}`;
    else if (digits.length === 11 && digits[0] === "1") e164 = `+${digits}`;
    if (e164) params.set("location", e164);
  }

  return `${base}/general-meeting?${params.toString()}`;
}

export default function ConfirmShell({
  market,
  hsm,
  prefill = {},
}: {
  market: CampaignMarket;
  hsm: ResolvedMarket | null;
  prefill?: CalendlyPrefill;
}) {
  const [zipOpen, setZipOpen] = useState(false);

  // embed_domain must match the actual parent host (localhost / preview /
  // production), so it is resolved client-side after mount. The iframe renders
  // once this is set — a single load with the events-enabled URL, never a
  // src swap mid-flight.
  const [embedDomain, setEmbedDomain] = useState<string | null>(null);
  useEffect(() => {
    // window.location.host (with port), matching Calendly's own widget.js
    // getDomain() — Calendly derives the postMessage target origin from
    // embed_domain, so any mismatch silently drops the events.
    setEmbedDomain(window.location.host);
  }, []);

  // Funnel: the Calendly step was reached. Stored UTMs attach automatically.
  useEffect(() => {
    gaEvent("booking_view", { market: market.slug || "unknown" });
  }, [market.slug]);

  // The iframe must grow to fit Calendly's content — it ships scrolling="no",
  // so a fixed height makes everything below the fold unreachable (the
  // "Enter Details" step is far taller than the calendar view). Calendly
  // posts calendly.page_height for exactly this purpose; we track it here.
  const [calHeight, setCalHeight] = useState(700);

  // Calendly's inline iframe posts lifecycle messages to the parent:
  //   calendly.page_height    → resize the iframe to fit (handled above)
  //   calendly.event_scheduled → true goal event (booking_complete)
  // Only trust messages from calendly.com origins.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      let origin = "";
      try {
        origin = new URL(e.origin).hostname;
      } catch {
        return;
      }
      if (origin !== "calendly.com" && !origin.endsWith(".calendly.com")) return;

      const data = e.data as { event?: string; payload?: { height?: string | number } } | null;
      if (data?.event === "calendly.page_height") {
        // payload.height arrives as "1090px" (or a number) — parse defensively.
        const h = parseInt(String(data.payload?.height ?? ""), 10);
        if (Number.isFinite(h) && h > 0) setCalHeight(h);
      }
      if (data?.event === "calendly.event_scheduled") {
        gaEvent("booking_complete", { market: market.slug || "unknown" });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [market.slug]);

  const profileUrl =
    hsm?.hsm.calendlyUrl && hsm.hsm.calendlyUrl !== "#"
      ? hsm.hsm.calendlyUrl
      : null;

  const iframeSrc =
    profileUrl && embedDomain
      ? buildCalendlyIframeSrc(profileUrl, prefill, embedDomain)
      : null;

  return (
    <>
      <Header market={market} onPickerClick={() => setZipOpen(true)} />

      <main className="lp-confirm">
        <div className="lp-shell lp-confirm-grid">

          {/* ── Left: HSM card ── */}
          <div className="lp-confirm-left">
            <p className="lp-confirm-eyebrow">Your local Curbio team</p>
            {hsm ? (
              <div className="lp-hsm">
                <div className="lp-hsm-photo">
                  {hsm.hsm.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hsm.hsm.photo}
                      alt={`${hsm.hsm.name}, ${hsm.hsm.title}`}
                      style={{
                        position: "absolute", inset: 0,
                        width: "100%", height: "100%",
                        objectFit: "cover", objectPosition: "center top",
                      }}
                    />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: "var(--stone)" }} />
                  )}
                  <span className="lp-hsm-badge">
                    <Icon name="pin" size={13} color="#fff" /> {hsm.displayName}
                  </span>
                </div>
                <div className="lp-hsm-body">
                  <div className="lp-hsm-name">{hsm.hsm.name}</div>
                  <div className="lp-hsm-title">{hsm.hsm.title}</div>
                  <p className="lp-hsm-bio">{hsm.hsm.bio}</p>
                  <div className="lp-hsm-stats">
                    <span>
                      <Icon name="home" size={15} color="var(--amber)" />
                      <span>Local to {hsm.name}</span>
                    </span>
                    <span>
                      <span className="lp-dot-wrap" aria-hidden>
                        <span className={"lp-dot" + (hsm.isBusinessHours ? " on" : "")} />
                      </span>
                      <span>{hsm.isBusinessHours ? "Available now" : "Replies next day"}</span>
                    </span>
                  </div>
                  {hsm.hsm.phone && (
                    <a className="lp-hsm-callbox" href={`tel:${hsm.hsm.phoneRaw}`}>
                      <span className="lp-hsm-callicon">
                        <Icon name="phone" size={18} color="var(--amber)" />
                      </span>
                      <span className="lp-hsm-callinfo">
                        <span className="lp-hsm-calllabel">Call {hsm.hsm.firstName} directly</span>
                        <span className="lp-hsm-callnum">{hsm.hsm.phone}</span>
                      </span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="lp-hsm" style={{ padding: "32px 24px" }}>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--navy)", margin: 0 }}>
                  Your local Curbio manager will be in touch shortly.
                </p>
              </div>
            )}
          </div>

          {/* ── Right: Calendly + No thanks ── */}
          <div className="lp-confirm-right">
            <p className="lp-confirm-eyebrow">Pick a time that works for you</p>
            {profileUrl ? (
              <div className="lp-confirm-cal-wrap">
                {/* Direct iframe — no widget script. Rendered once embedDomain
                    resolves (client mount) so the URL carries embed_domain and
                    Calendly emits its postMessage lifecycle events. */}
                {/* No scrolling="no": when Calendly's page_height resize keeps
                    the iframe taller than its content there is no inner
                    scrollbar anyway, and if a height message is ever missed
                    the user can still scroll inside the frame to reach the
                    submit button (scrolling="no" made the lower form
                    unreachable). */}
                {iframeSrc && (
                  <iframe
                    src={iframeSrc}
                    width="100%"
                    height={calHeight}
                    frameBorder="0"
                    title={`Schedule a call with ${hsm?.hsm.firstName ?? "your local manager"}`}
                    style={{ border: 0, display: "block", borderRadius: 8 }}
                  />
                )}
                <a href="/" className="lp-confirm-nothx">
                  No thanks, I&apos;ll wait
                </a>
              </div>
            ) : (
              <>
                <div className="lp-confirm-no-cal">
                  <p style={{ fontSize: 16, color: "var(--fg-muted)", lineHeight: 1.6 }}>
                    {hsm?.hsm.firstName ?? "Your local manager"} will reach out within one
                    business day to find a time that works for you.
                  </p>
                </div>
                <a href="/" className="lp-confirm-nothx">
                  No thanks, I&apos;ll wait
                </a>
              </>
            )}
          </div>

        </div>
      </main>

      <ZipModal open={zipOpen} onClose={() => setZipOpen(false)} current={market} />
    </>
  );
}
