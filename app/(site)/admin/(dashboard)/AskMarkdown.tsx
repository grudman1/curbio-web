import { Fragment, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// A small markdown renderer for assistant answers.
//
// Deliberately not a dependency. The model is instructed to produce a narrow
// subset — paragraphs, bold, inline code, bullet and numbered lists, headings,
// and TABLES — and a 150-line renderer covers that subset exactly, on the ops
// type scale, with no library, no sanitiser question, and no dangerouslySet
// anything. Everything below builds React elements from text; no HTML string
// ever reaches the DOM, so model output cannot inject markup.
//
// Anything outside the subset degrades to plain text, which is the right
// failure: an unrendered asterisk is readable, a crash is not.
// ─────────────────────────────────────────────────────────────────────────────

/** Inline pass: **bold**, `code`. Split-and-rebuild, never innerHTML. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(
        <strong key={`${keyBase}-b${i}`} style={{ fontWeight: 600, color: "var(--ops-text)" }}>
          {tok.slice(2, -2)}
        </strong>
      );
    } else {
      out.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded-[4px] px-1 py-0.5 text-[12.5px]"
          style={{ background: "var(--ops-gray-100, #f2f4f7)", fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)" }}
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

const isDivider = (line: string) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");

export function AskMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // table — a header row followed by a --- divider
    if (line.trim().startsWith("|") && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {head.map((h, hi) => (
                  <th
                    key={hi}
                    className="whitespace-nowrap px-2.5 py-1.5 text-left font-semibold"
                    style={{ borderBottom: "1px solid var(--ops-border)", color: "var(--ops-text-muted)" }}
                  >
                    {inline(h, `th${key}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className="px-2.5 py-1.5 align-top"
                      style={{ borderBottom: "1px solid var(--ops-border)", color: "var(--ops-text)" }}
                    >
                      {inline(c, `td${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // heading
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push(
        <p
          key={key++}
          className="mb-1.5 mt-4 first:mt-0"
          style={{ fontWeight: 600, fontSize: h[1].length <= 2 ? 15 : 14, color: "var(--ops-text)" }}
        >
          {inline(h[2], `h${key}`)}
        </p>
      );
      i++;
      continue;
    }

    // list — bullet or numbered
    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const items: string[] = [];
      while (i < lines.length && (bullet.test(lines[i]) || numbered.test(lines[i]))) {
        items.push(lines[i].replace(bullet, "").replace(numbered, ""));
        i++;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag
          key={key++}
          className={`my-2 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}
          style={{ color: "var(--ops-text)" }}
        >
          {items.map((it, ii) => (
            <li key={ii} className="text-[13.5px] leading-relaxed">
              {inline(it, `li${key}-${ii}`)}
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    // paragraph — consume until a blank line or a block starter
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("|") &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !bullet.test(lines[i]) &&
      !numbered.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 text-[13.5px] leading-relaxed first:mt-0" style={{ color: "var(--ops-text)" }}>
        {inline(para.join(" "), `p${key}`)}
      </p>
    );
  }

  return <Fragment>{blocks}</Fragment>;
}
