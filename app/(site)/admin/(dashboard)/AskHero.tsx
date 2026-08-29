"use client";

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// The Ask hero — the top of Home. You arrive at a prompt, and the dashboard
// is what sits underneath it.
//
// THIS IS THE SHELL ONLY. Nothing is wired to a model yet: the send button
// accepts a question and does nothing with it. When ANTHROPIC_API_KEY is
// absent the textarea is disabled — but the suggestion chips still render, so
// the screen still shows what this thing will be able to answer.
//
// ── The atmosphere ──────────────────────────────────────────────────────────
// Three heavily-blurred radial gradients — navy, teal, amber, in the brand's
// own three colours — drifting on 30s/38s/46s loops. The periods are
// deliberately coprime-ish so the three never resynchronise into a visible
// pulse; the blur radius is large enough that no individual blob edge is ever
// resolvable. A linear fade to the page ground (--ops-bg) across the bottom
// third dissolves the section into the cards below it rather than ending on
// a hard edge.
//
// Under prefers-reduced-motion the DRIFT stops and the gradients stay (see
// tokens.css). The wash is the design; the movement is the flourish, and only
// the flourish is negotiable.
//
// ── The greeting, and why it starts neutral ─────────────────────────────────
// "Good morning/afternoon/evening" needs the VISITOR's local clock, and this
// component is SSR'd — the server's wall clock is whatever timezone the
// deployment runs in. Computing the daypart during render would make the
// server's guess and the browser's first paint disagree whenever the two fall
// on opposite sides of a boundary: a hydration mismatch, not just an
// occasionally-wrong greeting. So the first paint is time-agnostic
// ("Welcome back, {name}") and a post-mount effect swaps in the real daypart
// from the visitor's own Date. Same idiom as CountUp.tsx.
// ─────────────────────────────────────────────────────────────────────────────

type Suggestion = { label: string; ink: string };

function greetingFor(firstName: string): string {
  const hour = new Date().getHours();
  const daypart = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `Good ${daypart}, ${firstName}`;
}

export function AskHero({
  configured,
  firstName,
  scopeLabel,
  attributionLabel,
  suggestions,
}: {
  configured: boolean;
  firstName: string;
  /** "Scope: August · All markets" — the live header state, not a constant. */
  scopeLabel: string;
  /** "Last touch" / "First touch" — likewise. */
  attributionLabel: string;
  suggestions: Suggestion[];
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [greeting, setGreeting] = useState(() => `Welcome back, ${firstName}`);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setGreeting(greetingFor(firstName));
  }, [firstName]);

  function fill(text: string) {
    setValue(text);
    inputRef.current?.focus();
  }

  return (
    <section className="relative -mx-4 -mt-5 md:-mx-6">
      {/* The wash. aria-hidden and pointer-events-none throughout: it is
          decoration, and it sits under interactive content. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="ops-drift ops-drift-a absolute left-[-16%] top-[-46%] h-[150%] w-[80%] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(13,37,77,.40), rgba(13,37,77,0) 74%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="ops-drift ops-drift-b absolute right-[-18%] top-[-52%] h-[155%] w-[84%] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(23,108,103,.32), rgba(23,108,103,0) 74%)",
            filter: "blur(66px)",
          }}
        />
        <div
          className="ops-drift ops-drift-c absolute left-[22%] top-[-40%] h-[130%] w-[62%] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(205,134,41,.24), rgba(205,134,41,0) 72%)",
            filter: "blur(64px)",
          }}
        />
        {/* Dissolve into the page ground. Same token as the body background,
            so the seam is provably invisible rather than approximately so. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--ops-bg) 35%, transparent) 62%, var(--ops-bg) 96%)",
          }}
        />
      </div>

      <div className="relative px-6 pb-14 pt-16">
        <h1 className="ops-display m-0 text-center" style={{ fontSize: 40, lineHeight: 1.12 }}>
          {greeting}
        </h1>

        <div
          className="ops-card relative mx-auto mt-7 max-w-[780px] transition-shadow duration-base ease-out"
          style={
            focused
              ? { borderColor: "var(--ops-brand)", boxShadow: "var(--ops-ring)" }
              : { boxShadow: "var(--ops-shadow-xs)" }
          }
        >
          <textarea
            ref={inputRef}
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={!configured}
            placeholder={configured ? "Ask about pacing, channels, markets, attribution…" : ""}
            aria-label="Ask a question about the dashboard"
            className="block min-h-[84px] w-full resize-none border-0 bg-transparent px-[18px] pb-2 pt-4 text-[15px] leading-relaxed outline-none disabled:cursor-not-allowed"
            style={{ color: "var(--ops-text)" }}
          />

          <div className="flex items-center gap-2 pb-3 pl-4 pr-3 pt-2">
            <ScopeChip>{scopeLabel}</ScopeChip>
            <ScopeChip>{attributionLabel}</ScopeChip>
            <div className="flex-1" />
            <span className="ops-subtle text-[12px]" aria-hidden>
              ⏎ to ask
            </span>
            <button
              type="button"
              disabled={!configured || value.trim() === ""}
              aria-label="Ask"
              className="inline-flex h-[34px] w-[34px] flex-none cursor-pointer items-center justify-center rounded-[8px] border-0 text-white transition-colors duration-fast ease-out disabled:cursor-not-allowed disabled:opacity-30"
              style={{ background: "var(--ops-brand)" }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--ops-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--ops-brand)";
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Rendered whether or not the assistant is configured — they are the
            page's statement of what it can answer, not controls that depend
            on a key being present. */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => fill(s.label)}
              disabled={!configured}
              className="ops-btn h-8 gap-2 rounded-[var(--ops-r-pill)] px-3 text-[13px] disabled:cursor-not-allowed"
            >
              <span
                className="h-[5px] w-[5px] flex-none rounded-full"
                style={{ background: s.ink }}
                aria-hidden
              />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScopeChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="ops-muted inline-flex h-7 items-center rounded-full border px-2.5 text-[12px]"
      style={{ borderColor: "var(--ops-border)", background: "var(--ops-surface)" }}
    >
      {children}
    </span>
  );
}
