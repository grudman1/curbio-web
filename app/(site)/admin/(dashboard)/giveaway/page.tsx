import type { Metadata } from "next";
import { ANSWER_LABEL, GIVEAWAYS } from "@/config/giveaways";
import { MARKET_BY_SLUG } from "@/config/markets";
import { maskPhone } from "@/lib/adminLeads";
import { emailListConfigured } from "@/lib/giveaway/emailList";
import {
  entryCount,
  isAppOutstanding,
  isDrawable,
  isInApp,
  isInternalAddress,
  type GiveawayEntry,
} from "@/lib/giveaway/entry";
import { deliveryMode, isClosed, storeScope } from "@/lib/giveaway/mode";
import { isEmailListOutstanding } from "@/lib/giveaway/service";
import { readDraws, readEntries, readLog } from "@/lib/giveaway/store";
import { PageHeader } from "../../_ui/v2/PageHeader";
import { OpsCard } from "../../_ui/v2/OpsCard";
import { EmptyState } from "../../_ui/v2/EmptyState";
import { StatusBadge } from "../../_ui/v2/HealthDot";
import { FilterChips } from "../../_ui/FilterChips";
import { buttonClass } from "../../_ui/Button";
import { currentAdminUser } from "../../_ui/session";
import {
  BonusTool,
  DrawPanel,
  EmailListPanel,
  EntriesTable,
  ReconcilePanel,
  type EntryRow,
} from "./GiveawayAdmin";

// ─────────────────────────────────────────────────────────────────────────────
// Giveaway entries — who entered, where each person was routed, and the
// drawing.
//
// OWNER-ONLY, with one exception. The screen lists every entrant's name and
// email, exports their phone numbers and picks prize winners, so everything
// but the first card is rendered for an owner and nobody else. The exception
// is the bonus tool: booth staff add the "visited the booth" bonus, and they
// are not owners. It takes an email and answers with a first name — it cannot
// be used to browse.
//
// The role comes from the server session, never from a prop or a query param,
// and every action re-checks it (actions.ts). This page hiding a card is
// presentation; that file is the gate.
//
// Phone numbers stay masked in the table, as on the Leads screen: the list is
// what gets screenshotted. They are whole in the export and beside a drawn
// winner's name, the two places someone actually needs to dial one.
//
// ONE ROW PER PERSON by construction — the store is keyed by email — so
// "deduped" is not a step that happens here.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Giveaway · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
// The actions behind this screen (actions.ts) run under this limit too. Two of
// them work through a list — recording bookings, catching the email list up —
// and each item can include a call to the app or to ActiveCampaign. They are
// batched so no single call needs long, and this is the headroom above that.
export const maxDuration = 60;

// The event runs on Mountain time, so that is the clock this screen shows.
const MT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function Stat({ label, value, tone }: { label: string; value: number | null; tone?: "bad" }) {
  return (
    <div className="min-w-[72px]">
      <div
        className={`ops-metric-value ops-tnum${value === null ? " ops-metric-value--empty" : ""}${
          tone === "bad" && value ? " text-tone-bad" : ""
        }`}
      >
        {value === null ? "—" : value}
      </div>
      <div className="ops-subtle mt-1">{label}</div>
    </div>
  );
}

function marketLabel(e: GiveawayEntry): string {
  if (e.marketSlug) return MARKET_BY_SLUG[e.marketSlug]?.name ?? e.marketSlug;
  return e.zip ? `Not listed · ${e.zip}` : "Not listed";
}


type Filter = "all" | "app" | "list" | "attention" | "tests";

export default async function GiveawayAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const [me, sp] = await Promise.all([currentAdminUser(), searchParams]);
  const isOwner = me?.role === "owner";
  // One giveaway today. When there is a second, this becomes a picker.
  const giveaway = GIVEAWAYS[0];
  const scope = storeScope(giveaway);
  const closed = isClosed(giveaway);
  const sandbox = deliveryMode() === "sandbox";

  const header = (
    <PageHeader
      title="Giveaway"
      subtitle={`${giveaway.event.shortName} · ${closed ? "closed" : "closes"} ${giveaway.drawing.long}`}
      badge={
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge
            status={closed ? "closed" : "open"}
            tone={closed ? "neutral" : "success"}
            title={closed ? "The entry period has ended." : "Entries are being accepted."}
          />
          {sandbox && (
            <StatusBadge
              status="sandbox"
              tone="warning"
              title="Not production: entries here are kept apart from the real drawing, and nothing is sent to the app or to ActiveCampaign."
            />
          )}
        </span>
      }
      right={
        isOwner ? (
          // A plain anchor, not a Link: this is a file download from a route
          // handler, and the router must not try to prefetch or render it.
          <a href={`/api/admin/giveaway/export?giveaway=${giveaway.slug}`} download className={buttonClass()}>
            Export CSV
          </a>
        ) : undefined
      }
    />
  );

  const bonusCard = (
    <OpsCard
      title="Add bonus entries"
      titleTooltip={`The free alternative in the Official Rules: +${giveaway.bonusEntries} for visiting the booth or asking in writing — the same as booking a call, once per person.`}
    >
      <BonusTool slug={giveaway.slug} bonusEntries={giveaway.bonusEntries} closed={closed} isOwner={isOwner} />
    </OpsCard>
  );

  if (!isOwner) {
    return (
      <>
        {header}
        <div className="max-w-[560px]">{bonusCard}</div>
      </>
    );
  }

  const [read, draws, log] = await Promise.all([
    readEntries(scope),
    readDraws(scope),
    readLog(scope, 40),
  ]);
  const readable = read.configured && !read.error;
  const entries = readable ? read.entries : [];

  // An entry that needs a person: it should be with an HSM and is not
  // confirmed there (refused, never reported back, or never attempted), or its
  // email-list step is still owed. Both are judged against where the entry
  // SHOULD go now — someone since handed to an HSM no longer owes a list sync.
  const needsAttention = (e: GiveawayEntry) =>
    !sandbox && (isAppOutstanding(e, giveaway) || isEmailListOutstanding(e, giveaway));

  const drawable = entries.filter(isDrawable);
  const counts = {
    all: entries.length,
    app: entries.filter((e) => ["sent", "sandbox"].includes(e.routing.app.status)).length,
    list: entries.filter((e) => ["synced", "sandbox"].includes(e.routing.emailList.status)).length,
    attention: entries.filter(needsAttention).length,
    tests: entries.filter((e) => e.isTest).length,
  };
  const filter: Filter = (["app", "list", "attention", "tests"] as const).find((k) => k === sp.f) ?? "all";
  const shown = entries.filter((e) => {
    if (filter === "app") return ["sent", "sandbox"].includes(e.routing.app.status);
    if (filter === "list") return ["synced", "sandbox"].includes(e.routing.emailList.status);
    if (filter === "attention") return needsAttention(e);
    if (filter === "tests") return e.isTest;
    return true;
  });

  const rows: EntryRow[] = shown.map((e) => ({
    email: e.email,
    name: e.name,
    phone: maskPhone(e.phone),
    market: marketLabel(e),
    inMarket: e.marketSlug !== null,
    answer: ANSWER_LABEL[e.listing90],
    entries: entryCount(e, giveaway),
    bonus: e.bonus?.source ?? null,
    bonusBy: e.bonus?.by ?? null,
    booked: e.booking?.via ?? null,
    entered: MT.format(new Date(e.createdAt)),
    inDrawing: isDrawable(e),
    afterClose: !e.inEntryPeriod,
    isTest: e.isTest,
    revisions: e.revisions,
    app: e.routing.app.status === "none" && isAppOutstanding(e, giveaway) ? "due" : e.routing.app.status,
    appDetail:
      e.routing.app.status === "failed"
        ? `${e.routing.app.crmStatus ? `HTTP ${e.routing.app.crmStatus}. ` : ""}${e.routing.app.error ?? ""}`.trim()
        : e.routing.app.reason
          ? `Why: ${e.routing.app.reason.replace("_", " ")}`
          : "",
    estimateId: e.routing.app.estimateId ?? null,
    canSend: e.marketSlug !== null && !isInternalAddress(e.email) && !isInApp(e),
    emailList: e.routing.emailList.status,
    emailListDetail: e.routing.emailList.error ?? "",
  }));

  const outstanding = sandbox ? 0 : entries.filter((e) => isEmailListOutstanding(e, giveaway)).length;

  return (
    <>
      {header}

      {read.configured && read.error && (
        <p className="mb-ops-gap rounded-md bg-pill-bad-bg px-3 py-2 font-sans text-ops-body text-pill-bad-fg">
          The entry store could not be read: {read.error}
        </p>
      )}

      <div className="mb-ops-gap grid grid-cols-1 gap-ops-gap md:grid-cols-3">
        <OpsCard
          title="In the drawing"
          titleTooltip="People who entered during the entry period, not counting our own tests. Entries are 1 each, or 1 plus the bonus."
        >
          <div className="flex flex-wrap gap-8">
            <Stat label="people" value={readable ? drawable.length : null} />
            <Stat
              label="entries"
              value={readable ? drawable.reduce((n, e) => n + entryCount(e, giveaway), 0) : null}
            />
            <Stat label="with bonus" value={readable ? drawable.filter((e) => e.bonus).length : null} />
          </div>
        </OpsCard>
        <OpsCard
          title="Where they went"
          titleTooltip="Sent to the app: said Yes, booked a call, or used the contact form after the close. Email list: every entrant — including those sent to the app — on their market's list and the Engaged list, tagged with the event, their market and their answer."
        >
          <div className="flex flex-wrap gap-8">
            <Stat label={sandbox ? "app (sandbox)" : "sent to app"} value={readable ? counts.app : null} />
            <Stat label={sandbox ? "email list (sandbox)" : "on email list"} value={readable ? counts.list : null} />
            <Stat label="need attention" value={readable ? counts.attention : null} tone="bad" />
          </div>
        </OpsCard>
        <OpsCard
          title="Not in the drawing"
          titleTooltip="Kept, but never drawn: our own test entries and Curbio addresses, and anyone who first used the page after the entry period."
        >
          <div className="flex flex-wrap gap-8">
            <Stat label="ours" value={readable ? counts.tests : null} />
            <Stat
              label="after close"
              value={readable ? entries.filter((e) => !e.isTest && !e.inEntryPeriod).length : null}
            />
          </div>
        </OpsCard>
      </div>

      <div className="mb-ops-gap max-w-[560px]">{bonusCard}</div>

      <div className="mb-ops-gap">
        <FilterChips
          param="f"
          active={filter}
          options={[
            { key: "all", label: "All", count: readable ? counts.all : null },
            { key: "app", label: "Sent to app", count: readable ? counts.app : null },
            { key: "list", label: "Email list", count: readable ? counts.list : null },
            { key: "attention", label: "Needs attention", count: readable ? counts.attention : null },
            { key: "tests", label: "Ours", count: readable ? counts.tests : null },
          ]}
        />
        <OpsCard title="Entries" control={<span className="ops-subtle">one row per person</span>} ruled>
          {!read.configured ? (
            <EmptyState headline="Upstash not configured in this environment." />
          ) : rows.length === 0 ? (
            <EmptyState headline={filter === "all" ? "No entries yet." : "Nothing matches this filter."} />
          ) : (
            <EntriesTable slug={giveaway.slug} rows={rows} sandbox={sandbox} />
          )}
        </OpsCard>
      </div>

      <div className="mb-ops-gap grid grid-cols-1 gap-ops-gap lg:grid-cols-2">
        <OpsCard
          title="Check bookings against Calendly"
          titleTooltip="A booking recorded by the page is the visitor's browser saying so. Before the drawing, paste the invitee emails from Calendly: bookings made some other way get their bonus, and claims Calendly has no record of are listed for you to decide on."
        >
          <ReconcilePanel slug={giveaway.slug} />
        </OpsCard>
        <OpsCard
          title="Email list"
          titleTooltip="ActiveCampaign. Each entrant goes on their market's list — or the Master Contact List when the market has none — and on the Engaged list, tagged with the event, their market and their answer. Anyone who has ever unsubscribed is left alone, and so is a Curbio address."
        >
          <EmailListPanel
            slug={giveaway.slug}
            outstanding={outstanding}
            configured={emailListConfigured()}
            sandbox={sandbox}
            unsubscribed={entries.filter((e) => e.routing.emailList.status === "unsubscribed").length}
            tag={giveaway.emailList.tag}
          />
        </OpsCard>
      </div>

      <div className="mb-ops-gap">
        <OpsCard
          title="The drawing"
          titleTooltip="Weighted by entries, random from a recorded seed, run on a frozen copy of the list. Re-running the same seed over the same list always gives the same names — that is what Verify does."
        >
          <DrawPanel
            slug={giveaway.slug}
            closed={closed}
            winners={giveaway.kit.winners}
            kitName={giveaway.kit.name}
            draws={draws}
            eligiblePeople={drawable.length}
            notify={`Notify by email and phone within ${giveaway.rules.notifyWithinHours} hours. A winner has ${giveaway.rules.respondWithinDays} days to respond before the next alternate takes the kit.`}
          />
        </OpsCard>
      </div>

      <div className="max-w-[860px]">
        <OpsCard title="Recent activity" control={<span className="ops-subtle">last {log.length}</span>} ruled>
          {log.length === 0 ? (
            <EmptyState headline="Nothing yet." />
          ) : (
            <ul className="m-0 list-none p-0">
              {log.map((l, i) => (
                <li
                  key={`${l.at}-${i}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-app-border py-2 font-sans text-ops-body last:border-b-0"
                >
                  <span className="ops-subtle ops-tnum w-[112px] flex-none">{MT.format(new Date(l.at))}</span>
                  <span className="font-semibold text-content">{l.action.replace(/_/g, " ")}</span>
                  {l.email && <span className="text-content-muted">{l.email}</span>}
                  {l.detail && <span className="text-content-muted">· {l.detail}</span>}
                  <span className="ops-subtle ml-auto">{l.by}</span>
                </li>
              ))}
            </ul>
          )}
        </OpsCard>
      </div>
    </>
  );
}
