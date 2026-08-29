"use client";

import { useEffect, useRef, useState } from "react";
import { AskMarkdown } from "./AskMarkdown";

// ─────────────────────────────────────────────────────────────────────────────
// The Ask hero — the top of Home. You arrive at a prompt, and the dashboard
// is what sits underneath it.
//
// WIRED. The send button posts the conversation to /api/admin/ask, which runs
// the model over the tool surface in app/api/admin/ask/tools.ts and streams
// SSE frames back. When ANTHROPIC_API_KEY is absent the textarea is disabled —
// but the suggestion chips still render, so the screen still shows what this
// thing can answer.
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
//
// ── History is session-only, and deliberately so ────────────────────────────
// The transcript lives in this component's state and nowhere else. No
// localStorage, no Redis, no server-side thread. Reload the page and it is
// gone. Marketing numbers and draft copy are not worth persisting into a store
// nobody agreed to, and "New question" is one click.
// ─────────────────────────────────────────────────────────────────────────────

type Suggestion = { label: string; ink: string };
type Turn = { role: "user" | "assistant"; content: string };

const PLACEHOLDER =
  "Ask me to analyze, explain, draft, compose, and problem-solve anything related to Curbio's marketing and sales.";

/** Human labels for the tools, for the loading line. Unknown names fall back
 *  to the raw name rather than to a generic "working" — if a tool is added and
 *  this map is not, the screen says which one, which is a better bug report. */
const TOOL_LABELS: Record<string, string> = {
  getQualifiedByMarketChannel: "Reading the performance grid",
  getMarketDetail: "Reading market detail",
  getChannelDetail: "Reading channel detail",
  getAttributionHealth: "Checking attribution health",
  getLeads: "Reading recent leads",
  getTrend: "Building the trend",
  getSystemHealth: "Diagnosing what's broken",
  getSiteContext: "Reading the site registry and stack",
};

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
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setGreeting(greetingFor(firstName));
  }, [firstName]);

  // A navigation away mid-answer must not leave the fetch running.
  useEffect(() => () => abortRef.current?.abort(), []);

  const started = turns.length > 0 || streaming;

  // A chip is a QUESTION, not a draft of one. Filling the box and waiting for
  // a second click made the chip a two-step affordance for a one-step
  // intention. `ask` takes the text directly rather than reading `value`,
  // because setState is async and the very next render is too late.
  function askChip(text: string) {
    setValue(text);
    void ask(text);
  }

  function reset() {
    abortRef.current?.abort();
    setTurns([]);
    setAnswer("");
    setError(null);
    setActiveTool(null);
    setStreaming(false);
    setValue("");
    inputRef.current?.focus();
  }

  async function ask(override?: string) {
    const question = (override ?? value).trim();
    if (!question || streaming || !configured) return;

    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setValue("");
    setAnswer("");
    setError(null);
    setActiveTool(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = "";
    try {
      const res = await fetch("/api/admin/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `Request failed (${res.status}).`);
      }

      // SSE frames: `event: <name>\ndata: <json>\n\n`.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const nameLine = frame.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!nameLine || !dataLine) continue;
          const event = nameLine.slice(7).trim();
          let data: { delta?: string; name?: string; error?: string };
          try {
            data = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }
          if (event === "text" && data.delta) {
            acc += data.delta;
            setAnswer(acc);
            setActiveTool(null);
          } else if (event === "tool" && data.name) {
            setActiveTool(data.name);
          } else if (event === "error" && data.error) {
            setError(data.error);
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setStreaming(false);
      setActiveTool(null);
      if (acc.trim()) {
        setTurns((t) => [...t, { role: "assistant", content: acc }]);
        setAnswer("");
      }
    }
  }

  return (
    <section className="relative -mx-4 -mt-5 md:-mx-6">
      {/* The wash. aria-hidden and pointer-events-none throughout: it is
          decoration, and it sits under interactive content. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* The wash: one slow linear gradient panning across an oversized box,
            with two soft blooms drifting against it. Navy, teal and sage —
            all sanctioned for large colour blocks. The amber blob that used to
            sit here is gone: it put the brand's single accent behind the whole
            screen, which is the one thing the colour rules forbid. */}
        <div className="ops-wash absolute inset-0" />
        <div
          className="ops-bloom ops-bloom-a absolute left-[-14%] top-[-48%] h-[150%] w-[78%] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(13,37,77,.34), rgba(13,37,77,0) 74%)",
            filter: "blur(64px)",
          }}
        />
        <div
          className="ops-bloom ops-bloom-b absolute right-[-16%] top-[-52%] h-[155%] w-[82%] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(23,108,103,.30), rgba(23,108,103,0) 74%)",
            filter: "blur(70px)",
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
          // ONE frame. app/globals.css paints a global amber focus ring on
          // form controls, which landed inside this card's navy one — amber
          // within navy, which reads as an error state. The textarea's own
          // ring is suppressed (.ops-ask-input in tokens.css) and the card
          // carries focus: navy border, soft navy ring.
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask();
              }
            }}
            disabled={!configured || streaming}
            placeholder={configured ? PLACEHOLDER : ""}
            aria-label="Ask a question about the dashboard"
            className="ops-ask-input block min-h-[84px] w-full resize-none border-0 bg-transparent px-[18px] pb-2 pt-4 text-[15px] leading-relaxed outline-none disabled:cursor-not-allowed"
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
              onClick={() => void ask()}
              disabled={!configured || streaming || value.trim() === ""}
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

        {/* Chips are the page's statement of what it can answer — so they are
            rendered whether or not a key is present, and retire the moment a
            conversation exists. */}
        {!started && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => askChip(s.label)}
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
        )}

        {started && (
          <div className="mx-auto mt-5 max-w-[780px]">
            <div className="ops-card" style={{ boxShadow: "none" }}>
              <div
                className="flex items-center justify-between px-5 pb-2 pt-4"
                style={{ borderBottom: "1px solid var(--ops-border)" }}
              >
                <span
                  className="text-[11px] font-semibold uppercase"
                  style={{ letterSpacing: "0.08em", color: "var(--ops-text-subtle)" }}
                >
                  Answer
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="cursor-pointer border-0 bg-transparent p-0 text-[12px] underline underline-offset-2"
                  style={{ color: "var(--ops-text-muted)" }}
                >
                  New question
                </button>
              </div>

              <div className="px-5 pb-5 pt-3" aria-live="polite">
                {turns.map((t, i) =>
                  t.role === "user" ? (
                    <p
                      key={i}
                      className="mb-3 mt-4 text-[13px] font-semibold first:mt-0"
                      style={{ color: "var(--ops-text-muted)" }}
                    >
                      {t.content}
                    </p>
                  ) : (
                    <div key={i} className="mb-4">
                      <AskMarkdown text={t.content} />
                    </div>
                  )
                )}

                {answer && <AskMarkdown text={answer} />}

                {streaming && !answer && (
                  <div className="flex items-center gap-2 py-1">
                    <Spinner />
                    <span className="text-[13px]" style={{ color: "var(--ops-text-muted)" }}>
                      {activeTool ? (TOOL_LABELS[activeTool] ?? activeTool) : "Thinking"}…
                    </span>
                  </div>
                )}

                {error && (
                  <p
                    className="mt-2 text-[13px]"
                    style={{ color: "var(--ops-error-500, #d92d20)" }}
                  >
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      className="ops-spin flex-none"
      fill="none"
      stroke="var(--ops-text-subtle)"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
    </svg>
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
