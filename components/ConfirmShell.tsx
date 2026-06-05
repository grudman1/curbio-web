"use client";

import { useState } from "react";
import { Header } from "./LpSections";
import { ZipModal } from "./LpModals";
import { Icon } from "./LpKit";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { ResolvedMarket } from "@/lib/markets";

export type CalendlyPrefill = {
  name?: string;
  email?: string;
  /** Maps to Calendly custom question slot a2.
   *  Confirmed by inspection: a1 = textarea ("Please share anything..."),
   *  a2 = Phone number (flag + country-code input). */
  phone?: string;
};

// Build the direct Calendly iframe URL. All HSMs use the "general-meeting"
// event slug — verified via the Calendly API. Direct iframe is faster and
// more reliable than the widget script (no JS loading, no CSP issues).
function buildCalendlyIframeSrc(
  profileUrl: string,
  prefill: CalendlyPrefill = {}
): string {
  const base = profileUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    embed_type: "Inline",
    hide_gdpr_banner: "1",
    background_color: "ffffff",
    text_color: "0d254d",
    primary_color: "cd8629",
  });

  // Prefill params — only appended when the value is non-empty.
  // Custom question slots confirmed by inspection:
  //   a1 = "Please share anything that will help prepare for our meeting." (textarea)
  //   a2 = Phone number (flag + country-code input, already shows +1)
  //
  // Calendly's phone widget shows "+1 [input]" and expects the 10-digit
  // national number WITHOUT the leading country code. Strip all non-digits,
  // then drop a leading "1" so +1 (301) 529-4344 → 3015294344, not 13015294344.
  // 11-digit values with a leading 1 would be silently rejected by the widget.
  if (prefill.name)  params.set("name",  prefill.name);
  if (prefill.email) params.set("email", prefill.email);
  if (prefill.phone) {
    const digits = prefill.phone.replace(/\D/g, "");
    const national = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
    if (national.length === 10) params.set("a2", national);
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

  const profileUrl =
    hsm?.hsm.calendlyUrl && hsm.hsm.calendlyUrl !== "#"
      ? hsm.hsm.calendlyUrl
      : null;

  const iframeSrc = profileUrl ? buildCalendlyIframeSrc(profileUrl, prefill) : null;

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
            {iframeSrc ? (
              <div className="lp-confirm-cal-wrap">
                {/* Direct iframe — no JS, no widget script, loads instantly */}
                <iframe
                  src={iframeSrc}
                  width="100%"
                  height="700"
                  frameBorder="0"
                  scrolling="no"
                  title={`Schedule a call with ${hsm?.hsm.firstName ?? "your local manager"}`}
                  style={{ border: 0, display: "block", borderRadius: 8 }}
                />
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
