"use client";

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// The Ask hero — the top third of Home, ActiveCampaign's model: you arrive at
// a prompt, and the dashboard is what sits underneath it.
//
// THIS IS THE SHELL ONLY. Nothing is wired to a model yet: the send button
// accepts a question and does nothing with it, and says so rather than
// pretending. When ANTHROPIC_API_KEY is absent the input is disabled outright
// — a dead input with no explanation is the thing this codebase doesn't do.
//
// ── The gradient surface ─────────────────────────────────────────────────────
// This is the ONE colored surface in the app (2026-08 personalization pass) —
// everything below it stays on the white / --ui2-bg system. That is a
// deliberate scarcity: a dashboard that's colored everywhere has nowhere left
// to put emphasis, so the navy-to-slate wash is spent here, on the one thing
// every visit starts with, and nowhere else.
//
// ── The greeting, and why it starts neutral ──────────────────────────────────
// "Good morning/afternoon/evening" needs the VISITOR's local clock, and this
// component is SSR'd — the server's wall clock is whatever timezone the
// deployment happens to run in, which is not Gavin's. Computing the daypart
// during render would make the server's guess and the browser's first paint
// disagree whenever the two happen to fall on opposite sides of a boundary,
// which is a hydration mismatch, not just an occasionally-wrong greeting.
// So the safe initial value is time-agnostic ("Welcome back, {name}") —
// identical on the server and on the client's first paint — and a `useEffect`
// (which only ever runs in the browser, after hydration) swaps in the real
// daypart read from the visitor's own `Date`. Same idiom as CountUp.tsx: SSR
// renders the value that's true regardless of the client, JS refines it after
// mount.
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Why is Maryland ahead?",
  "What's our worst market?",
  "How much of August is unattributed?",
  "Which channel improved most?",
];

function greetingFor(firstName: string): string {
  const hour = new Date().getHours();
  const daypart = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `Good ${daypart}, ${firstName}`;
}

export function AskHero({ configured, firstName }: { configured: boolean; firstName: string }) {
  const [value, setValue] = useState("");
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
    <section
      className="rounded-ui2-card px-6 py-10 shadow-ui2-card"
      style={{ background: "linear-gradient(135deg, #0D254D 0%, #1B3A6B 100%)" }}
    >
      <h2 className="m-0 text-center font-ui2 text-[24px] font-bold leading-tight text-white">
        {greeting}
      </h2>
      <p className="m-0 mt-1 text-center font-ui2 text-[15px] text-white/70">
        What do you want to know?
      </p>

      <div className="mt-6">
        <div className="relative mx-auto max-w-[720px] rounded-xl border border-white/20 bg-white/10 transition-shadow duration-150 focus-within:border-white/40 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.16)]">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!configured}
            rows={3}
            placeholder={configured ? "Ask about pacing, channels, markets, attribution…" : ""}
            aria-label="Ask a question about the dashboard"
            className="block min-h-[100px] w-full resize-y rounded-xl border-0 bg-transparent px-4 pb-14 pt-3.5 font-ui2 text-[16px] leading-relaxed text-white outline-none placeholder:text-white/50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={!configured || value.trim() === ""}
            aria-label="Ask"
            className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border-0 bg-ui2-accent text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
            </svg>
          </button>
        </div>

        {configured ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => fill(s)}
                className="cursor-pointer rounded-full border border-white/25 bg-white/10 px-3 py-1.5 font-ui2 text-[13px] text-white transition-colors duration-150 hover:border-white/45 hover:bg-white/15"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <p className="m-0 mt-3 text-center font-ui2 text-ui2-caption text-white/60">
            The assistant isn&apos;t configured on this deployment.
          </p>
        )}
      </div>
    </section>
  );
}
