"use client";

import { useState, useEffect } from "react";
import { Header } from "./LpSections";
import { ZipModal } from "./LpModals";
import { Icon } from "./LpKit";
import type { CampaignMarket } from "@/lib/campaignMarkets";
import type { ResolvedMarket } from "@/lib/markets";

// Inject the Calendly widget script immediately on mount — do NOT use
// next/script with strategy="lazyOnload" (it fires too late or never).
function useCalendly() {
  useEffect(() => {
    const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";

    // If the script is already on the page, just call initInlineWidgets
    // (handles the case where the user navigates back to this page).
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const w = window as unknown as { Calendly?: { initInlineWidgets: () => void } };
      w.Calendly?.initInlineWidgets();
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Clean up only if we added it
      const el = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (el) el.remove();
    };
  }, []);
}

export default function ConfirmShell({
  market,
  hsm,
}: {
  market: CampaignMarket;
  hsm: ResolvedMarket | null;
}) {
  const [zipOpen, setZipOpen] = useState(false);
  useCalendly();

  const calendlyUrl =
    hsm?.hsm.calendlyUrl && hsm.hsm.calendlyUrl !== "#"
      ? hsm.hsm.calendlyUrl
      : null;

  // Build Calendly URL with brand colours
  const embedUrl = calendlyUrl
    ? `${calendlyUrl}?hide_gdpr_banner=1&background_color=ffffff&text_color=0d254d&primary_color=cd8629`
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
            {embedUrl ? (
              <div className="lp-confirm-cal-wrap">
                {/* Calendly initialises this div via the script injected in useCalendly() */}
                <div
                  className="calendly-inline-widget"
                  data-url={embedUrl}
                  style={{ minWidth: 320, height: 630 }}
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
