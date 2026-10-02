#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Weekly step 1 of 2: raw app CRM exports → stripped CSVs under data/imports/.
//
//   node scripts/prepare-app-export.mjs ~/Downloads/reports_attributionreport*.csv \
//        ~/Downloads/reports_leadsreport*.csv ~/Downloads/reports_salesreport*.csv \
//        [--exported 2026-10-02]
//
// Pass the three NEWEST files, in any order — each is recognised by its header.
// Then run step 2: `npx tsx scripts/import-app-snapshot.ts`. The whole
// procedure is in docs/app-snapshot-refresh.md.
//
// WHAT IS KEPT: only the columns scripts/import-app-snapshot.ts reads. The raw
// exports carry homeowner names and street addresses (deal/project titles),
// agent names, phone-ish free text and agent emails — none of which the
// snapshot needs, and all of which used to be committed verbatim.
//
//   Agent email  → "Agent key": sha256(lowercased, trimmed email), 16 hex. The
//                  importer only ever uses the email as a JOIN KEY between the
//                  three reports, and equal emails still produce equal keys.
//                  Pseudonymous, not anonymous: a known email can be hashed
//                  and looked up. It is not a reason to share these files.
//   Project      → "Label": "<market> <deal type> won <date>" — enough to find
//                  an unjoinable sales row in the app, without the address.
//
// THE FENCE. The export's own day is partial: it was taken at some time of
// day, and anything created after that moment is in neither the export nor —
// for non-web leads — the live feed. So the snapshot is cut at the LAST
// COMPLETE UTC DAY: asOf = exported − 1 day. Deals created on the export day
// are dropped by the importer; the live feed covers that day for website
// leads, and the next export brings the rest. This is what makes the fence
// exact: the snapshot owns every day ≤ asOf, the live feed every day after.
//
// --exported defaults to TODAY in UTC. Pass it when importing a file that was
// downloaded on an earlier day.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "data/imports");

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const files = [];
let exported = new Date().toISOString().slice(0, 10);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--exported") exported = args[++i];
  else files.push(args[i]);
}
if (files.length !== 3 || !/^\d{4}-\d{2}-\d{2}$/.test(exported)) {
  console.error("usage: node scripts/prepare-app-export.mjs <attribution.csv> <leads.csv> <sales.csv> [--exported YYYY-MM-DD]");
  process.exit(1);
}
const asOf = new Date(Date.parse(`${exported}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

// ── CSV ──────────────────────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const cell = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const toCsv = (rows) => rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";

const agentKey = (email) => {
  const e = (email ?? "").trim().toLowerCase();
  return e ? createHash("sha256").update(e).digest("hex").slice(0, 16) : "";
};

// ── recognise each file by its header ───────────────────────────────────────
const KINDS = {
  attribution: {
    out: "app-attribution.csv",
    // Row 0 is a section band (Identity/Funnel/…); row 1 is the header.
    headerRow: 1,
    test: (rows) => rows[1]?.includes("Deal ID") && rows[1]?.includes("Origin"),
    keep: ["Deal ID", "Created date", "Market code", "Stage", "Status", "Deal value", "Channel", "Origin",
      "Referral source", "UTM source", "UTM medium", "UTM campaign", "UTM content"],
  },
  leads: {
    out: "app-leads.csv",
    headerRow: 0,
    test: (rows) => rows[0]?.includes("Deal") && rows[0]?.includes("Salesperson"),
    keep: ["Created date", "Deal type"],
  },
  sales: {
    out: "app-sales.csv",
    headerRow: 0,
    test: (rows) => rows[0]?.includes("Project") && rows[0]?.includes("Won date"),
    keep: ["Created date", "Won date", "Revenue", "Deal type"],
  },
};

const seen = {};
for (const path of files) {
  const rows = parseCsv(readFileSync(path, "utf8").replace(/^﻿/, ""));
  const kind = Object.entries(KINDS).find(([, k]) => k.test(rows));
  if (!kind) throw new Error(`not a recognised app report: ${path}`);
  const [name, k] = kind;
  if (seen[name]) throw new Error(`two ${name} reports passed: ${seen[name]} and ${path}`);
  seen[name] = path;

  const header = rows[k.headerRow];
  const at = (col) => {
    const i = header.indexOf(col);
    if (i < 0) throw new Error(`${name} report is missing column "${col}" — has the app export changed?`);
    return i;
  };
  const keepIdx = k.keep.map(at);
  const emailIdx = at("Agent email");
  const out = [[...k.keep, "Agent key", ...(name === "sales" ? ["Label"] : [])]];
  for (const r of rows.slice(k.headerRow + 1)) {
    const kept = [...keepIdx.map((i) => r[i] ?? ""), agentKey(r[emailIdx])];
    if (name === "sales") {
      const market = r[at("Market")] ?? "";
      kept.push(`${market} ${r[at("Deal type")]} won ${(r[at("Won date")] ?? "").slice(0, 10) || "—"}`);
    }
    out.push(kept);
  }
  writeFileSync(resolve(OUT, k.out), toCsv(out));
  console.log(`${name.padEnd(11)} ${String(out.length - 1).padStart(4)} rows → data/imports/${k.out}`);
}
for (const name of Object.keys(KINDS)) if (!seen[name]) throw new Error(`no ${name} report among the files passed`);

writeFileSync(resolve(OUT, "app-export.json"), JSON.stringify({ exported, asOf }, null, 2) + "\n");
console.log(`\nexported ${exported} → snapshot asOf ${asOf} (last complete UTC day). Next: npx tsx scripts/import-app-snapshot.ts`);
