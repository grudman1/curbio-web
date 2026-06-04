"use client";

import {
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";

// ── Icons (ported from the design's ui.jsx LP_ICONS, lucide-style strokes) ──
const LP_ICONS: Record<string, string> = {
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z",
  calendar: "M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  clipboard:
    "M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2",
  check: "M20 6L9 17l-5-5",
  arrow: "M5 12h14 M12 5l7 7-7 7",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4",
  dollar: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  x: "M18 6L6 18 M6 6l12 12",
  star: "M12 2l3 7 7 .5L17 14.5 18.5 22 12 18l-6.5 4L7 14.5 2 9.5 9 9z",
  mail: "M4 4h16v16H4z M22 6l-10 7L2 6",
};

export function Icon({
  name,
  size = 24,
  color = "currentColor",
  stroke = 1.75,
  fill = "none",
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  stroke?: number;
  fill?: string;
  style?: CSSProperties;
}) {
  const d = LP_ICONS[name];
  if (!d) return null;
  const isFilled = fill !== "none";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={isFilled ? fill : color}
      strokeWidth={isFilled ? 0 : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      {d.split(/\s(?=M)/).map((seg, i) => (
        <path key={i} d={seg} />
      ))}
    </svg>
  );
}

export function Eyebrow({
  children,
  amber,
  style,
}: {
  children: ReactNode;
  amber?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: amber ? "var(--amber)" : "var(--navy)",
        lineHeight: 1.3,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function AmberRule({ width = 56, style }: { width?: number; style?: CSSProperties }) {
  return (
    <span
      style={{ display: "block", width, height: 3, background: "var(--amber)", borderRadius: 2, ...style }}
    />
  );
}

const BTN_SIZES: Record<string, CSSProperties> = {
  sm: { padding: "9px 18px", fontSize: 13 },
  md: { padding: "13px 24px", fontSize: 15 },
  lg: { padding: "16px 30px", fontSize: 16 },
};

type Variant = "primary" | "secondary" | "ghostNavy" | "white";

export function PillButton({
  children,
  variant = "primary",
  size = "md",
  onClick,
  full,
  icon,
  style,
  type = "button",
  disabled,
  href,
  target,
}: {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  full?: boolean;
  icon?: string;
  style?: CSSProperties;
  type?: "button" | "submit";
  disabled?: boolean;
  href?: string;
  target?: string;
}) {
  const base: CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    borderRadius: 999,
    border: 0,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .22s var(--ease-out)",
    letterSpacing: "0.01em",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    width: full ? "100%" : "auto",
    lineHeight: 1.1,
    textDecoration: "none",
  };
  const variants: Record<Variant, CSSProperties> = {
    primary: { background: "var(--amber)", color: "#fff" },
    secondary: { background: "transparent", color: "var(--navy)", border: "1.5px solid var(--navy)" },
    ghostNavy: { background: "rgba(255,255,255,0.10)", color: "#fff", border: "1px solid rgba(255,255,255,0.22)" },
    white: { background: "#fff", color: "var(--navy)", border: "1px solid var(--stone)" },
  };
  const v = variants[variant];
  const cls = `lp-btn lp-btn-${variant}${disabled ? " lp-btn-disabled" : ""}`;
  const merged: CSSProperties = { ...base, ...BTN_SIZES[size], ...v, opacity: disabled ? 0.4 : 1, ...style };
  const inner = (
    <>
      {children}
      {icon && <Icon name={icon} size={size === "lg" ? 19 : 17} color="currentColor" />}
    </>
  );
  if (href && !disabled) {
    return (
      <a className={cls} href={href} target={target} rel={target ? "noreferrer noopener" : undefined} style={merged}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} className={cls} onClick={disabled ? undefined : onClick} style={merged} disabled={disabled}>
      {inner}
    </button>
  );
}

export function StarRow({ count = 5, size = 16, style }: { count?: number; size?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", gap: 3, ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <Icon key={i} name="star" size={size} fill="var(--amber)" />
      ))}
    </div>
  );
}

export function PhotoPlaceholder({
  label,
  tone = "warm",
  style,
  children,
}: {
  label?: string;
  tone?: "warm" | "dim" | "navy";
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const labelColor = tone === "dim" || tone === "navy" ? "rgba(255,255,255,0.6)" : "rgba(13,37,77,0.42)";
  return (
    <div className={`lp-ph lp-ph-${tone}`} style={style}>
      {children}
      {label ? (
        <span className="lp-ph-label" style={{ color: labelColor }}>
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  half,
  textarea,
  inputMode,
  maxLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  half?: boolean;
  textarea?: boolean;
  inputMode?: "text" | "numeric" | "email";
  maxLength?: number;
}) {
  return (
    <label
      style={{ display: "flex", flexDirection: "column", gap: 7, gridColumn: half ? "span 1" : "1 / -1" }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--navy)",
        }}
      >
        {label}
        {required && <span style={{ color: "var(--amber)" }}> *</span>}
      </span>
      {textarea ? (
        <textarea
          className="lp-input"
          value={value}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="lp-input"
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 520,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="lp-overlay" onMouseDown={onClose}>
      <div className="lp-modal" style={{ maxWidth }} onMouseDown={(e) => e.stopPropagation()}>
        <button className="lp-modal-x" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} color="var(--navy)" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function SuccessPanel({
  title,
  body,
  onClose,
}: {
  title: string;
  body: ReactNode;
  onClose: () => void;
}) {
  return (
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
        {title}
      </h2>
      <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: "0 auto 22px", lineHeight: 1.55, maxWidth: 380 }}>
        {body}
      </p>
      <PillButton size="lg" variant="secondary" onClick={onClose} style={{ minWidth: 160 }}>
        Done
      </PillButton>
    </div>
  );
}
