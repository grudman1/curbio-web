import fs from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// The three distilled knowledge files, loaded once per lambda and folded into
// the system prompt.
//
// The SOURCE documents in docs/knowledge/ are never read at runtime — they are
// .docx and a 68MB zip, and re-reading them per request would be both slow and
// pointless. config/*-knowledge.md is the distillation, and it is the only
// thing the assistant sees. When a source doc changes, re-distill by hand.
//
// ── Why fs and not an import ────────────────────────────────────────────────
// Next.js has no built-in loader that turns .md into a string import, and
// adding one is a webpack/turbopack config change — outside this change's
// scope. Reading from process.cwd() is the in-scope option.
//
// The read is memoised at module scope, so it happens once per cold start, not
// once per request. A missing file degrades to a labelled placeholder rather
// than throwing: an assistant that answers without brand rules is wrong, but
// an /admin Home that 500s because a doc moved is worse, and the placeholder
// tells the model to say so out loud.
// ─────────────────────────────────────────────────────────────────────────────

const FILES = {
  brand: "brand-knowledge.md",
  plan: "plan-knowledge.md",
  design: "design-knowledge.md",
} as const;

export type KnowledgeKey = keyof typeof FILES;

function read(file: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), "config", file), "utf8");
  } catch {
    return `[${file} could not be read at runtime — say so if asked about this area rather than answering from memory.]`;
  }
}

let cached: Record<KnowledgeKey, string> | null = null;

export function knowledge(): Record<KnowledgeKey, string> {
  if (!cached) {
    cached = {
      brand: read(FILES.brand),
      plan: read(FILES.plan),
      design: read(FILES.design),
    };
  }
  return cached;
}
