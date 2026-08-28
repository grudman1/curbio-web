"use client";

import { useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// The Ask hero — the top third of Home, ActiveCampaign's model: you arrive at
// a prompt, and the dashboard is what sits underneath it.
//
// THIS IS THE SHELL ONLY. Nothing is wired to a model yet: the send button
// accepts a question and does nothing with it, and says so rather than
// pretending. When ANTHROPIC_API_KEY is absent the input is disabled outright
// — a dead input with no explanation is the thing this codebase doesn't do.
// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Why is Maryland ahead?",
  "What's our worst market?",
  "How much of August is unattributed?",
  "Which channel improved most?",
];

export function AskHero({ configured }: { configured: boolean }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function fill(text: string) {
    setValue(text);
    inputRef.current?.focus();
  }

  return (
    <section className="rounded-ui2-card border border-ui2-border bg-ui2-card px-6 py-10 shadow-ui2-card">
      <h2 className="m-0 text-center font-ui2 text-[24px] font-bold leading-tight text-ui2-text">
        What do you want to know?
      </h2>

      <div className="mt-6">
        <div className="relative mx-auto max-w-[720px] rounded-xl border border-ui2-border bg-ui2-card transition-shadow duration-150 focus-within:border-ui2-accent focus-within:shadow-[0_0_0_3px_var(--ui2-accent-ring)]">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!configured}
            rows={3}
            placeholder={configured ? "Ask about pacing, channels, markets, attribution…" : ""}
            aria-label="Ask a question about the dashboard"
            className="block min-h-[100px] w-full resize-y rounded-xl border-0 bg-transparent px-4 pb-14 pt-3.5 font-ui2 text-[16px] leading-relaxed text-ui2-text outline-none placeholder:text-ui2-gray-400 disabled:cursor-not-allowed disabled:bg-ui2-well"
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
                className="cursor-pointer rounded-full border border-ui2-border bg-ui2-card px-3 py-1.5 font-ui2 text-[13px] text-ui2-text-muted transition-colors duration-150 hover:border-ui2-gray-300 hover:text-ui2-text"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <p className="m-0 mt-3 text-center font-ui2 text-ui2-caption text-ui2-gray-400">
            The assistant isn&apos;t configured on this deployment.
          </p>
        )}
      </div>
    </section>
  );
}
