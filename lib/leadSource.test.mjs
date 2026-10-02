// Run it:   node --test lib/leadSource.test.mjs
// (node:test, no dependency — same convention as monthFocus.test.mjs.)
//
// What is being protected: the Hub's Qualified count is "the website sent it to
// the app", decided from the delivery record — not from a list of sources.

import test from "node:test";
import assert from "node:assert/strict";
import { appStatus, classifyLive, needsAttention } from "./leadSource.ts";

const AS_OF = "2026-08-29";
const NOW = Date.parse("2026-09-20T12:00:00Z");

const lead = (o) => ({ leadId: o.leadId, source: "quote", market: "Atlanta", submittedAt: "2026-09-10T15:00:00.000Z", ...o });
const ok = (leadId, o = {}) => ({ leadId, submittedAt: "2026-09-01T00:00:00Z", crmAttempted: true, crmOk: true, crmStatus: 200, ...o });
const row = (l, d) => ({ lead: l, delivery: d ?? null });
const run = (rows) => classifyLive(rows, { asOf: AS_OF, now: NOW });

test("a lead sent to the app is Qualified, and is not flagged", () => {
  const r = run([row(lead({ leadId: "a" }), ok("a"))]);
  assert.equal(r.qualified.length, 1);
  assert.equal(r.qualified[0].status, "sent");
  assert.equal(needsAttention("sent"), false);
});

test("a failed CRM delivery still counts as Qualified, and needs attention", () => {
  const r = run([row(lead({ leadId: "f" }), ok("f", { crmOk: false, crmStatus: 500, crmError: "boom" }))]);
  assert.equal(r.qualified.length, 1);
  assert.equal(r.qualified[0].status, "failed");
  assert.equal(needsAttention("failed"), true);
});

test("delivered but with no market and no ZIP is Qualified and needs attention", () => {
  const r = run([row(lead({ leadId: "u" }), ok("u", { unroutable: true }))]);
  assert.equal(r.qualified[0].status, "unroutable");
  assert.equal(needsAttention("unroutable"), true);
});

test("no delivery record: pending when brand new, unconfirmed once past the grace period", () => {
  const ctx = { deliveryLogStart: "2026-09-01T00:00:00Z", now: NOW };
  assert.equal(appStatus(lead({ submittedAt: "2026-09-20T11:55:00Z" }), null, ctx), "pending");
  assert.equal(appStatus(lead({ submittedAt: "2026-09-10T11:55:00Z" }), null, ctx), "unconfirmed");
  // …and a lead from before the delivery log existed is simply unknowable.
  assert.equal(appStatus(lead({ submittedAt: "2026-08-30T11:55:00Z" }), null, ctx), "legacy");
});

test("waitlist, toolkit and webinar signups are never Qualified", () => {
  // Waitlist has its own list and toolkits/webinars have no endpoint, so none
  // of them are in leads:v1 — the feed cannot count what it is never given.
  // The one that could slip in is a waitlist-shaped row; it is refused.
  const r = run([row(lead({ leadId: "w", source: "waitlist" }), null)]);
  assert.equal(r.qualified.length, 0);
});

test("eXpcon: a Maybe has no leads:v1 row so is not counted; a Yes handed to the app is, and is labelled", () => {
  // giveaway:expcon-giveaway-oct:entries holds EVERY entrant (Yes, Maybe, Not
  // yet). Only an entrant handed to an HSM is also written to leads:v1
  // (lib/giveaway/appDelivery.ts). The Hub reads leads:v1 only.
  const giveawayEntries = [
    { id: "g-yes", listing90: "yes", inLeadsV1: true },
    { id: "g-maybe", listing90: "maybe", inLeadsV1: false },
    { id: "g-notyet", listing90: "not_yet", inLeadsV1: false },
  ];
  const leadsV1 = giveawayEntries
    .filter((e) => e.inLeadsV1)
    .map((e) => row(lead({ leadId: e.id, source: "exp-realty-utah", giveaway: "expcon-giveaway-oct", appReason: "answer" }), ok(e.id)));
  const r = run(leadsV1);
  assert.equal(r.qualified.length, 1);
  assert.equal(r.qualified[0].lead.leadId, "g-yes");
});

test("the Aug 29 fence is a UTC date and strictly 'after'", () => {
  const r = run([
    row(lead({ leadId: "on", submittedAt: "2026-08-29T23:59:00Z" }), ok("on")), // asOf day → in the snapshot
    row(lead({ leadId: "after", submittedAt: "2026-08-30T00:01:00Z" }), ok("after")),
  ]);
  assert.deepEqual(r.qualified.map((q) => q.lead.leadId), ["after"]);
});

test("a duplicate leadId is counted once", () => {
  const l = lead({ leadId: "d" });
  const r = run([row(l, ok("d")), row(l, ok("d"))]);
  assert.equal(r.qualified.length, 1);
});

test("source is a label, not a rule: an unknown source that reached the app counts", () => {
  const r = run([row(lead({ leadId: "n", source: "some-brand-new-campaign-2027" }), ok("n"))]);
  assert.equal(r.qualified.length, 1);
});

test("liveThrough is the newest lead date after the snapshot, of any status", () => {
  const r = run([
    row(lead({ leadId: "a", submittedAt: "2026-09-02T10:00:00Z" }), ok("a")),
    row(lead({ leadId: "b", submittedAt: "2026-09-15T10:00:00Z" }), ok("b", { crmOk: false })),
  ]);
  assert.equal(r.liveThrough, "2026-09-15");
});
