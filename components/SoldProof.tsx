"use client";

import { useState, type CSSProperties } from "react";
import type { SoldProofData, FilmstripItem } from "@/lib/atlantaSoldProjects";

const PLACEHOLDER = "/sold/_placeholder.svg";

// ── Types ──────────────────────────────────────────────────────────────────

type DisplayItem = {
  photo: string;
  before?: string;
  neighborhood: string;
  price: string;
  soldNote: string;
};

function filmstripToDisplay(item: FilmstripItem, defaultSoldNote: string): DisplayItem {
  return {
    photo: item.photo,
    before: item.before,
    neighborhood: item.neighborhood ?? item.label,
    price: item.price ?? "",
    soldNote: item.soldNote ?? defaultSoldNote,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────

/** img that gracefully falls back to the placeholder stripe SVG on error. */
function SoldImg({
  src,
  alt,
  style,
  className,
}: {
  src: string;
  alt: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        if (e.currentTarget.src !== window.location.origin + PLACEHOLDER) {
          e.currentTarget.src = PLACEHOLDER;
        }
      }}
    />
  );
}

/** Inline check-mark icon (avoids importing lucide just for this). */
function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function SoldProof({ data }: { data: SoldProofData }) {
  const [active, setActive] = useState<DisplayItem>({
    photo: data.featured.photo,
    before: data.featured.before,
    neighborhood: data.featured.neighborhood,
    price: data.featured.price,
    soldNote: data.featured.soldNote,
  });
  const [view, setView] = useState<"before" | "after">("after");
  const [fading, setFading] = useState(false);

  const hasBA = !!active.before;
  const photoSrc = hasBA && view === "before" ? active.before! : active.photo;

  function swap(item: FilmstripItem) {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      setActive(filmstripToDisplay(item, data.featured.soldNote));
      setView("after");
      setFading(false);
    }, 160);
  }

  return (
    <div className="lp-sold">
      {/* ── Eyebrow ──────────────────────────────────────────────── */}
      <div className="lp-sold-eyebrow">{data.eyebrow}</div>

      {/* ── Featured card ────────────────────────────────────────── */}
      <div className="lp-sold-card">
        {/* Photo area */}
        <div className="lp-sold-photo">
          <SoldImg
            src={photoSrc}
            alt={active.neighborhood}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: fading ? 0 : 1,
              transition: "opacity 0.16s ease",
            }}
          />

          {/* Pill(s) overlay */}
          {hasBA ? (
            // Before / After toggle pills
            <div className="lp-sold-ba-pills">
              <button
                className={`lp-sold-pill lp-sold-pill-navy${view === "before" ? " lp-sold-pill-active" : ""}`}
                onClick={() => setView("before")}
                aria-pressed={view === "before"}
              >
                Before
              </button>
              <button
                className={`lp-sold-pill lp-sold-pill-amber${view === "after" ? " lp-sold-pill-active" : ""}`}
                onClick={() => setView("after")}
                aria-pressed={view === "after"}
              >
                After
              </button>
            </div>
          ) : (
            // Single amber "Sold" pill
            <span className="lp-sold-pill lp-sold-pill-amber lp-sold-pill-sold" aria-label="Sold">
              <CheckIcon />
              Sold
            </span>
          )}
        </div>

        {/* Caption row */}
        <div className="lp-sold-caption">
          <div className="lp-sold-caption-left">
            <div className="lp-sold-hood">{active.neighborhood}</div>
            <div className="lp-sold-note">{active.soldNote}</div>
          </div>
          {active.price && (
            <div className="lp-sold-price">{active.price}</div>
          )}
        </div>
      </div>

      {/* ── Filmstrip ─────────────────────────────────────────────── */}
      <div className="lp-sold-filmstrip" role="list">
        {data.filmstrip.map((item, i) => (
          <button
            key={i}
            className="lp-sold-thumb"
            onClick={() => swap(item)}
            aria-label={`View ${item.label}`}
            role="listitem"
          >
            <div className="lp-sold-thumb-img">
              <SoldImg
                src={item.photo}
                alt={item.label}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <span className="lp-sold-thumb-label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Closing line + divider ────────────────────────────────── */}
      <p className="lp-sold-closing">{data.closingLine}</p>
      <div className="lp-sold-divider" aria-hidden />
    </div>
  );
}
