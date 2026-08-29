import Anthropic from "@anthropic-ai/sdk";
import { requireAdminApiSession, unauthorized } from "@/lib/adminApiAuth";
import { systemPrompt } from "./systemPrompt";
import { TOOL_SCHEMAS, runTool } from "./tools";

// ─────────────────────────────────────────────────────────────────────────────
// THE ASK ENDPOINT — the model, its tools, and the loop between them.
//
// ── This route gates ITSELF, and that is not belt-and-braces ───────────────
// middleware.ts's matcher EXCLUDES /api, so the /admin session gate does not
// cover this route. An ungated one would be an open proxy to the Anthropic API
// on Curbio's key: anyone who found the URL could spend the budget and read
// the marketing numbers. requireAdminApiSession() applies the same two checks
// the edge does — see lib/adminApiAuth.ts.
//
// ── Streaming, and why SSE rather than a plain body ────────────────────────
// A question that runs three tools takes long enough that a non-streaming
// response reads as a hang. The loop below emits typed SSE frames — `tool`
// when a tool starts (so the card can name what it is doing), `text` for
// deltas, `done`, `error`. The client renders the text as it lands.
//
// ── The loop ───────────────────────────────────────────────────────────────
// Manual, not the SDK tool runner: we want to emit a frame per tool call for
// the loading state, and to hard-cap the number of round trips. MAX_TURNS is a
// runaway guard, not a quality setting — a well-formed question resolves in
// one or two.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A tool-backed answer is not a fast request. Measured locally on real
// questions: 6.4s for a single-tool data answer, 26.8s for a copy-generation
// one that ran several tools and then wrote a full draft. Vercel's default
// function ceiling is well under that, so without this the long answers — the
// valuable ones — get cut off mid-stream.
//
// 60s is chosen against the measured worst case plus headroom, not as a
// maximum-allowed value. MAX_TURNS is the real runaway guard; this is the
// wall clock the platform enforces underneath it.
export const maxDuration = 60;

/** Hard cap on model→tool→model round trips for one question. */
const MAX_TURNS = 8;

/** Cap on conversation turns accepted from the client. Session-only history
 *  lives in the browser; this bounds what one request can cost. */
const MAX_HISTORY = 20;

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!(await requireAdminApiSession())) return unauthorized();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not set in this environment." }),
      { status: 503, headers: { "content-type": "application/json" } }
    );
  }

  let body: { messages?: ClientMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Malformed request body." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY);

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return new Response(JSON.stringify({ error: "Expected a trailing user message." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const response = await client.messages.stream({
            model: "claude-opus-5",
            max_tokens: 16000,
            // Copy generation needs room to think about brand rules; data
            // answers resolve fast. Adaptive thinking covers both without a
            // per-question setting.
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            system: [
              {
                type: "text",
                text: systemPrompt(),
                // The system prompt is byte-stable within a deployment, so it
                // is the cached prefix. Verified via usage.cache_read_input_tokens.
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: TOOL_SCHEMAS,
            messages,
          });

          response.on("text", (delta) => send("text", { delta }));

          const message = await response.finalMessage();
          messages.push({ role: "assistant", content: message.content });

          if (message.stop_reason === "refusal") {
            send("error", { error: "The model declined to answer this one." });
            break;
          }

          const toolUses = message.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );
          if (toolUses.length === 0) break;

          // All tool_results for one assistant turn go back in ONE user
          // message — splitting them teaches the model to stop calling tools
          // in parallel.
          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const use of toolUses) {
            send("tool", { name: use.name });
            try {
              const out = await runTool(use.name, (use.input ?? {}) as Record<string, unknown>);
              results.push({
                type: "tool_result",
                tool_use_id: use.id,
                content: JSON.stringify(out),
              });
            } catch (err) {
              results.push({
                type: "tool_result",
                tool_use_id: use.id,
                is_error: true,
                content: `Tool failed: ${err instanceof Error ? err.message : String(err)}`,
              });
            }
          }
          messages.push({ role: "user", content: results });

          if (turn === MAX_TURNS - 1) {
            send("error", { error: "Stopped after too many tool round trips." });
          }
        }

        send("done", {});
      } catch (err) {
        const message =
          err instanceof Anthropic.AuthenticationError
            ? "The Anthropic API key was rejected."
            : err instanceof Anthropic.RateLimitError
              ? "Rate limited by the Anthropic API — try again in a moment."
              : err instanceof Anthropic.APIError
                ? `Anthropic API error ${err.status}.`
                : "Something went wrong answering that.";
        send("error", { error: message });
        send("done", {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
    },
  });
}
