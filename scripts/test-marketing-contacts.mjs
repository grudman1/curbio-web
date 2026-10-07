#!/usr/bin/env node
// Tests lib/marketingContacts.ts against an in-process stand-in of the
// ActiveCampaign v3 API. No network beyond 127.0.0.1; no real keys.
//
//   node scripts/test-marketing-contacts.mjs
//
// Every scenario checks the RESULT and what was WRITTEN (POST/PUT count).

import http from "node:http";
import assert from "node:assert/strict";

// ── Stand-in ActiveCampaign ──────────────────────────────────────────────────
const S = {};
function reset(opts = {}) {
  S.mode = opts.mode ?? "ok"; // ok | down | hang
  S.writes = 0;
  S.calls = 0;
  S.lists = opts.noList ? [{ id: "3", name: "Master Contact List" }] : [{ id: "3", name: "Master Contact List" }, { id: "10", name: "Curbio Marketing" }];
  const titles = ["Contact Type", "Market", "Brokerage", "HSM Name", "HSM Email", "Lifecycle Stage", "Listing Timeline", "First Source", "Latest Source", "Consent Source", "Consent Date", "Market Slug", "Sentence1"];
  S.fields = titles.filter((t) => t !== opts.dropField).map((t, i) => ({
    id: String(20 + i),
    title: t,
    type: ["Contact Type", "Lifecycle Stage", "Listing Timeline"].includes(t) ? "dropdown" : t === "Consent Date" ? "date" : "text",
  }));
  const fid = (t) => S.fields.find((f) => f.title === t)?.id;
  S.options = [
    ...["Agent", "Team Lead", "Broker/Owner", "Partner", "Homeowner"].map((v) => ({ field: fid("Contact Type"), value: v })),
    ...["Subscriber", "Engaged", "Sales Qualified", "Customer"].filter((v) => v !== opts.dropOption).map((v) => ({ field: fid("Lifecycle Stage"), value: v })),
    ...["Within 90 days", "3-6 months", "Not yet"].map((v) => ({ field: fid("Listing Timeline"), value: v })),
  ].map((o, i) => ({ id: String(500 + i), ...o }));
  S.tags = opts.noTag ? [{ id: "7", tag: "event:expcon" }] : [{ id: "7", tag: "event:expcon" }, { id: "54", tag: "event:expcon-2026" }];
  S.contacts = []; // {id,email,firstName,lastName,phone}
  S.contactLists = []; // {contact,list,status}
  S.fieldValues = []; // {id,contact,field,value}
  S.contactTags = []; // {contact,tag}
  S.fid = fid;
}
function seedContact(c, { values = {}, lists = [], tags = [] } = {}) {
  const id = String(1000 + S.contacts.length);
  S.contacts.push({ id, ...c });
  for (const [t, v] of Object.entries(values)) S.fieldValues.push({ id: String(9000 + S.fieldValues.length), contact: id, field: S.fid(t), value: v });
  for (const [list, status] of lists) S.contactLists.push({ contact: id, list: String(list), status: String(status) });
  for (const tag of tags) S.contactTags.push({ contact: id, tag: String(tag) });
  return id;
}
const valueOf = (contact, title) => S.fieldValues.find((v) => v.contact === contact && v.field === S.fid(title))?.value ?? null;

const server = http.createServer(async (req, res) => {
  S.calls++;
  let body = "";
  for await (const c of req) body += c;
  if (S.mode === "hang") return; // never answers
  const send = (code, o) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
  if (S.mode === "down") return send(503, { message: "down" });
  if (req.headers["api-token"] !== "test-key") return send(403, {});
  const u = new URL(req.url, "http://x");
  const p = u.pathname.replace(/^\/api\/3/, "");
  const b = body ? JSON.parse(body) : {};
  if (req.method !== "GET") S.writes++;
  let m;
  if (req.method === "GET" && p === "/lists") return send(200, { lists: S.lists.filter((l) => l.name.includes(u.searchParams.get("filters[name]") ?? "")) });
  if (req.method === "GET" && p === "/fields") return send(200, { fields: S.fields, fieldOptions: S.options, meta: { total: S.fields.length } });
  if (req.method === "GET" && p === "/tags") return send(200, { tags: S.tags.filter((t) => t.tag.includes(u.searchParams.get("search") ?? "")) });
  if (req.method === "GET" && p === "/contacts") return send(200, { contacts: S.contacts.filter((c) => c.email === u.searchParams.get("email")) });
  if (req.method === "GET" && (m = p.match(/^\/contacts\/(\d+)\/contactLists$/))) return send(200, { contactLists: S.contactLists.filter((x) => x.contact === m[1]) });
  if (req.method === "GET" && (m = p.match(/^\/contacts\/(\d+)\/fieldValues$/))) return send(200, { fieldValues: S.fieldValues.filter((x) => x.contact === m[1]) });
  if (req.method === "GET" && (m = p.match(/^\/contacts\/(\d+)\/contactTags$/))) return send(200, { contactTags: S.contactTags.filter((x) => x.contact === m[1]) });
  if (req.method === "POST" && p === "/contacts") {
    const c = b.contact;
    if (S.contacts.some((x) => x.email === c.email)) return send(422, { errors: [{ title: "duplicate" }] });
    const id = seedContact({ email: c.email, firstName: c.firstName, lastName: c.lastName, phone: c.phone });
    for (const fv of c.fieldValues ?? []) S.fieldValues.push({ id: String(9000 + S.fieldValues.length), contact: id, field: fv.field, value: fv.value });
    return send(201, { contact: { id } });
  }
  if (req.method === "PUT" && (m = p.match(/^\/contacts\/(\d+)$/))) {
    const c = b.contact;
    for (const k of ["firstName", "lastName", "phone"]) if (k in c) S.contacts.find((x) => x.id === m[1])[k] = c[k];
    for (const fv of c.fieldValues ?? []) {
      const ex = S.fieldValues.find((v) => v.contact === m[1] && v.field === fv.field);
      if (ex) ex.value = fv.value; else S.fieldValues.push({ id: String(9000 + S.fieldValues.length), contact: m[1], field: fv.field, value: fv.value });
    }
    return send(200, { contact: { id: m[1] } });
  }
  if (req.method === "POST" && p === "/contactLists") {
    const { list, contact, status } = b.contactList;
    const ex = S.contactLists.find((x) => x.contact === String(contact) && x.list === String(list));
    if (ex) ex.status = String(status); else S.contactLists.push({ contact: String(contact), list: String(list), status: String(status) });
    return send(201, {});
  }
  if (req.method === "POST" && p === "/contactTags") { S.contactTags.push({ contact: String(b.contactTag.contact), tag: String(b.contactTag.tag) }); return send(201, {}); }
  return send(404, { message: `no route ${req.method} ${p}` });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

// ── The module, pointed at the stand-in ──────────────────────────────────────
process.env.ACTIVECAMPAIGN_ACCOUNT_URL = `http://127.0.0.1:${port}`;
process.env.ACTIVECAMPAIGN_API_KEY = "test-key";
process.env.MARKETING_CONTACTS_TIMEOUT_MS = "400";
delete process.env.VERCEL_ENV;
const M = await import("../lib/marketingContacts.ts");

const base = (over = {}) => ({
  email: "qa.agent@brokerage.test",
  firstName: "Qa",
  lastName: "Agent",
  phone: "5555550101",
  contactType: "Agent",
  market: "Atlanta, GA",
  brokerage: "eXp Realty",
  hsmName: "Christine Harvey",
  hsmEmail: "",
  lifecycle: "Engaged",
  listingTimeline: "3-6 months",
  firstSource: "event / expcon-giveaway-oct",
  latestSource: "event / expcon-giveaway-oct",
  consentSource: "eXpcon 2026 giveaway form (checkbox)",
  consentDate: "2026-10-07",
  tags: ["event:expcon-2026"],
  ...over,
});

const results = [];
async function scenario(name, fn) {
  M.resetMarketingSchemaCache();
  try { await fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", name, e.message]); }
}

await scenario("new contact: created with every field, subscribed to Curbio Marketing, tagged", async () => {
  reset();
  const r = await M.syncMarketingContact(base());
  assert.equal(r.status, "synced"); assert.equal(r.created, true);
  const c = S.contacts[0];
  assert.deepEqual([c.firstName, c.lastName, c.phone], ["Qa", "Agent", "5555550101"]);
  for (const [t, v] of [["Contact Type", "Agent"], ["Market", "Atlanta, GA"], ["Brokerage", "eXp Realty"], ["HSM Name", "Christine Harvey"], ["Lifecycle Stage", "Engaged"], ["Listing Timeline", "3-6 months"], ["First Source", "event / expcon-giveaway-oct"], ["Latest Source", "event / expcon-giveaway-oct"], ["Consent Source", "eXpcon 2026 giveaway form (checkbox)"], ["Consent Date", "2026-10-07"]]) assert.equal(valueOf(c.id, t), v, t);
  assert.deepEqual(S.contactLists.filter((x) => x.contact === c.id).map((x) => [x.list, x.status]), [["10", "1"]]);
  assert.deepEqual(S.contactTags.filter((x) => x.contact === c.id).map((x) => x.tag), ["54"]);
  assert.equal(valueOf(c.id, "Market Slug"), null); assert.equal(valueOf(c.id, "Sentence1"), null);
});

await scenario("existing contact: name, phone, Market, First Source NOT overwritten; Lifecycle not lowered; Latest Source + consent updated", async () => {
  reset();
  const id = seedContact({ email: "qa.agent@brokerage.test", firstName: "Real", lastName: "Name", phone: "2065550000" },
    { values: { Market: "Seattle, WA", "First Source": "email / nurture-jun", "Lifecycle Stage": "Sales Qualified", "Latest Source": "email / nurture-jun" }, lists: [[3, 1]] });
  const r = await M.syncMarketingContact(base({ firstName: "Typed", lastName: "Other", phone: "9999999999" }));
  assert.equal(r.status, "synced"); assert.equal(r.created, false);
  const c = S.contacts.find((x) => x.id === id);
  assert.deepEqual([c.firstName, c.lastName, c.phone], ["Real", "Name", "2065550000"]);
  assert.equal(valueOf(id, "Market"), "Seattle, WA");
  assert.equal(valueOf(id, "First Source"), "email / nurture-jun");
  assert.equal(valueOf(id, "Lifecycle Stage"), "Sales Qualified");
  assert.equal(valueOf(id, "Latest Source"), "event / expcon-giveaway-oct");
  assert.equal(valueOf(id, "Consent Date"), "2026-10-07");
  assert.equal(valueOf(id, "Contact Type"), "Agent"); // was empty → filled
  assert.equal(S.contacts.length, 1);
  assert.ok(S.contactLists.some((x) => x.contact === id && x.list === "10" && x.status === "1"));
  assert.ok(S.contactLists.some((x) => x.contact === id && x.list === "3" && x.status === "1")); // old list untouched
});

await scenario("lifecycle rises Engaged → Sales Qualified (a Yes lead sent to the app)", async () => {
  reset();
  const id = seedContact({ email: "qa.agent@brokerage.test" }, { values: { "Lifecycle Stage": "Engaged" }, lists: [[10, 1]], tags: [54] });
  const r = await M.syncMarketingContact(base({ lifecycle: "Sales Qualified", listingTimeline: "Within 90 days" }));
  assert.equal(r.status, "synced");
  assert.equal(valueOf(id, "Lifecycle Stage"), "Sales Qualified");
  assert.equal(valueOf(id, "Listing Timeline"), "Within 90 days");
  assert.equal(S.contactTags.filter((x) => x.contact === id).length, 1); // not re-tagged
  assert.equal(S.contactLists.filter((x) => x.contact === id).length, 1); // not re-subscribed
});

await scenario("unsubscribed contact: skipped, nothing written", async () => {
  reset();
  seedContact({ email: "qa.agent@brokerage.test" }, { lists: [[5, 2]] });
  const r = await M.syncMarketingContact(base());
  assert.equal(r.status, "unsubscribed"); assert.equal(S.writes, 0);
});

await scenario("bounced contact: skipped, nothing written", async () => {
  reset();
  seedContact({ email: "qa.agent@brokerage.test" }, { lists: [[10, 3]] });
  const r = await M.syncMarketingContact(base());
  assert.equal(r.status, "unsubscribed"); assert.equal(S.writes, 0);
});

for (const [name, opts, expect] of [
  ["missing list → fail closed, nothing written", { noList: true }, /Curbio Marketing" not found/],
  ["missing field → fail closed, nothing written", { dropField: "Consent Date" }, /"Consent Date" not found/],
  ["missing dropdown option → fail closed, nothing written", { dropOption: "Sales Qualified" }, /missing option/],
  ["missing tag → fail closed, nothing written", { noTag: true }, /tag "event:expcon-2026" not found/],
]) {
  await scenario(name, async () => {
    reset(opts);
    const r = await M.syncMarketingContact(base());
    assert.equal(r.status, "failed"); assert.match(r.error, expect); assert.equal(S.writes, 0); assert.equal(S.contacts.length, 0);
  });
}

await scenario("API down (503) → failed after retries, nothing written", async () => {
  reset({ mode: "down" });
  const r = await M.syncMarketingContact(base());
  assert.equal(r.status, "failed"); assert.match(r.error, /HTTP 503/); assert.equal(S.writes, 0);
});

await scenario("timeout → failed 'did not answer in time', nothing written", async () => {
  reset({ mode: "hang" });
  const r = await M.syncMarketingContact(base());
  assert.equal(r.status, "failed"); assert.match(r.error, /did not answer in time/); assert.equal(S.writes, 0);
});

await scenario("double submit (two at once): ONE contact; the loser fails cleanly and a retry completes", async () => {
  reset();
  const [a, b] = await Promise.all([M.syncMarketingContact(base()), M.syncMarketingContact(base())]);
  assert.equal(S.contacts.length, 1);
  assert.deepEqual([a.status, b.status].sort(), ["failed", "synced"]);
  const again = await M.syncMarketingContact(base());
  assert.equal(again.status, "synced"); assert.equal(S.contacts.length, 1);
  assert.equal(S.contactTags.filter((x) => x.tag === "54").length, 1);
});

await scenario("@example.com and @curbio.com → skipped, zero calls", async () => {
  reset();
  for (const email of ["zztest.x@example.com", "someone@curbio.com"]) {
    const r = await M.syncMarketingContact(base({ email }));
    assert.equal(r.status, "skipped");
  }
  assert.equal(S.calls, 0);
});

await scenario("previews never call ActiveCampaign (non-local URL, not production)", async () => {
  reset();
  const keep = process.env.ACTIVECAMPAIGN_ACCOUNT_URL;
  process.env.ACTIVECAMPAIGN_ACCOUNT_URL = "https://curbio.api-us1.com";
  process.env.VERCEL_ENV = "preview";
  const r = await M.syncMarketingContact(base());
  process.env.ACTIVECAMPAIGN_ACCOUNT_URL = keep;
  delete process.env.VERCEL_ENV;
  assert.equal(r.status, "not_configured"); assert.equal(S.calls, 0);
  assert.equal(M.marketingContactsEnabled(), true); // local stand-in again
});

await scenario("no keys → not_configured, zero calls", async () => {
  reset();
  const keep = process.env.ACTIVECAMPAIGN_API_KEY;
  delete process.env.ACTIVECAMPAIGN_API_KEY;
  const r = await M.syncMarketingContact(base());
  process.env.ACTIVECAMPAIGN_API_KEY = keep;
  assert.equal(r.status, "not_configured"); assert.equal(S.calls, 0);
});

await scenario("source label format", async () => {
  assert.equal(M.sourceLabel("event", "expcon-giveaway-oct"), "event / expcon-giveaway-oct");
  assert.equal(M.sourceLabel(null, null), "direct / none");
});

server.close();
for (const [s, n, e] of results) console.log(`${s}  ${n}${e ? `\n      ${e}` : ""}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
