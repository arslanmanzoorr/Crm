"use client";

import { ArrowUpRight, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { scrubbed } from "@/lib/consent";
import { movingSoon } from "@/lib/timeline";
import type { Lead, Task } from "@/lib/data";
import { useNow } from "./header";
import { LocalTime } from "./local-time";
import { DoneToggle } from "./tasks";
import { Avatar } from "./ui";

type Item =
  | { kind: "task"; task: Task; overdue: boolean }
  | { kind: "lead"; lead: Lead };

const callable = (l: Lead, today: string) => !!l.phone && !l.consent?.dnc && (!!l.consent?.call || scrubbed(l.consent?.dncCheckedOn, today));

/** "3 days overdue", "5 hours overdue", "Overdue": the age of a missed task in words. */
function overdueBy(dueAt: string, now: Date) {
  const h = Math.floor((now.getTime() - Date.parse(dueAt)) / 3_600_000);
  return h >= 24 ? `${Math.floor(h / 24)} day${h >= 48 ? "s" : ""} overdue` : h >= 1 ? `${h} hour${h > 1 ? "s" : ""} overdue` : "Overdue";
}

/**
 * "Who to call today": overdue work first, then today's tasks, then hot leads nobody has planned a step for.
 * The first one is the agent's next move and gets the stage; the rest wait below in order.
 */
export function Today({ leads, tasks }: { leads: Lead[]; tasks: Task[] }) {
  const now = useNow();
  if (!now) return <div className="h-48 rounded-card bg-surface-2" />;

  const open = tasks.filter((t) => !t.done && t.dueAt);
  const overdue = open.filter((t) => new Date(t.dueAt!) < now);
  const today = open.filter((t) => new Date(t.dueAt!) >= now && new Date(t.dueAt!).toDateString() === now.toDateString());
  const planned = new Set(open.map((t) => t.contactId));
  const hot = leads.filter((l) => (l.score >= 80 || movingSoon(l.moveBy)) && !planned.has(l.id) && !["Closed", "Lost"].includes(l.stage ?? ""));

  const items: Item[] = [
    ...overdue.map((task) => ({ kind: "task" as const, task, overdue: true })),
    ...today.map((task) => ({ kind: "task" as const, task, overdue: false })),
    ...hot.map((lead) => ({ kind: "lead" as const, lead })),
  ].slice(0, 7);
  const [first, ...rest] = items;

  const summary = [
    `${today.length} due today`,
    overdue.length ? `${overdue.length} overdue` : null,
    `${leads.filter((l) => l.score >= 80).length} hot leads`,
  ].filter(Boolean).join(" · ");

  return (
    <section data-tour="today" aria-labelledby="today" className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today" className="text-xl">Up next</h2>
        <p className="text-sm text-muted">{summary}</p>
      </div>
      {!first ? (
        <div className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-6">
          <p className="text-lg">You&apos;re clear.</p>
          <p className="max-w-prose text-sm text-muted">Nothing overdue and no hot lead without a plan. Add a task below, or open a lead and run <span className="text-ink">Analyze with AI</span> to plan the next step.</p>
          <Link href="/leads" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm font-medium hover:bg-accent hover:text-on-light">Open leads</Link>
        </div>
      ) : (
        <>
          <NextUp item={first} now={now} />
          {rest.length > 0 && (
            <ol aria-label="Then" className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
              {rest.map((it, i) => (
                <li key={it.kind === "task" ? it.task.id : it.lead.id} style={{ animationDelay: `${(i + 1) * 40}ms` }} className="flex animate-rise items-center gap-3 px-4 py-3 sm:px-5">
                  {it.kind === "task" ? <TaskRow {...it} now={now} /> : <LeadRow lead={it.lead} />}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

const actionBtn = "flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm font-medium text-ink transition duration-150 hover:bg-accent hover:text-on-light";
const primaryBtn = "flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-medium text-on-light transition duration-150 hover:bg-accent-strong active:scale-[0.98]";

/** The one thing to do now, given room: who, what, why, and the action itself. */
function NextUp({ item, now }: { item: Item; now: Date }) {
  const isTask = item.kind === "task";
  const name = isTask ? item.task.contact : item.lead.name;
  const leadId = isTask ? item.task.contactId : item.lead.id;
  const href = isTask
    ? (item.task.kind === "email" ? item.task.email && `mailto:${item.task.email}` : item.task.phone && `tel:${item.task.phone}`)
    : callable(item.lead, now.toISOString().slice(0, 10)) ? `tel:${item.lead.phone}` : null;
  const email = isTask && item.task.kind === "email";
  return (
    <article className="relative flex flex-col gap-5 overflow-hidden rounded-card bg-surface-2 bg-gradient-to-br from-accent/[0.08] via-transparent to-transparent p-5 ring-1 ring-accent/20 sm:p-6">
      <div className="flex items-start gap-4">
        {isTask ? <DoneToggle task={item.task} /> : <Avatar name={name} size={44} />}
        <div className="min-w-0 flex-1">
          <h3 className="text-2xl font-light text-balance sm:text-3xl">{isTask ? item.task.title : item.lead.nextAction || `Reach out to ${name.split(" ")[0]}`}</h3>
          <p className="mt-1.5 text-sm">
            {name && <span className="font-medium">{name}</span>}
            {isTask ? (
              <span className={item.overdue ? "text-score-1" : "text-muted"}>
                {name && " · "}{item.overdue ? overdueBy(item.task.dueAt!, now) : <>Due <LocalTime ts={item.task.dueAt!} opts={{ hour: "numeric", minute: "2-digit" }} /></>}
              </span>
            ) : (
              <span className="text-score-2"> · {item.lead.score >= 80 ? `Hot ${item.lead.score}` : item.lead.moveBy === "asap" ? "Moving ASAP" : "Moving in 1–3 months"} · no step planned</span>
            )}
          </p>
          {isTask && item.task.note && <p className="mt-2 max-w-prose text-sm text-muted">{item.task.note}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:pl-[3.75rem]">
        {href && (
          <a href={href} className={primaryBtn}>
            {email ? <Mail aria-hidden className="size-4" /> : <Phone aria-hidden className="size-4" />}
            {email ? "Email" : "Call"} {name.split(" ")[0]}
          </a>
        )}
        {leadId && <Link href={`/leads/${leadId}`} className={actionBtn}>Open lead <ArrowUpRight aria-hidden className="size-4" /></Link>}
      </div>
    </article>
  );
}

function TaskRow({ task, overdue, now }: { task: Task; overdue: boolean; now: Date }) {
  const href = task.kind === "email" ? task.email && `mailto:${task.email}` : task.phone && `tel:${task.phone}`;
  return (
    <>
      <DoneToggle task={task} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {task.title}
          {task.contact && <span className="font-normal text-muted"> · {task.contact}</span>}
        </p>
        <p className={`truncate text-sm ${overdue ? "text-score-1" : "text-muted"}`}>
          {overdue ? overdueBy(task.dueAt!, now) : <LocalTime ts={task.dueAt!} opts={{ weekday: "short", hour: "numeric", minute: "2-digit" }} />}
          {task.note && <span className="text-muted"> · {task.note}</span>}
        </p>
      </div>
      {href ? (
        <a href={href} aria-label={`${task.kind === "email" ? "Email" : "Call"} ${task.contact || ""}`.trim()} className={actionBtn}>
          {task.kind === "email" ? <Mail aria-hidden className="size-4" /> : <Phone aria-hidden className="size-4" />}
          <span className="hidden sm:inline">{task.kind === "email" ? "Email" : "Call"}</span>
        </a>
      ) : task.contactId ? (
        <Link href={`/leads/${task.contactId}`} aria-label={`Open ${task.contact}`} className={actionBtn}>Open</Link>
      ) : null}
    </>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <>
      <Avatar name={lead.name} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {lead.name} <span className="font-normal text-score-2">· {lead.score >= 80 ? `Hot ${lead.score}` : lead.moveBy === "asap" ? "Moving ASAP" : "Moving in 1–3 months"}</span>
        </p>
        <p className="truncate text-sm text-muted">{lead.nextAction || `No next step yet · ${lead.intent}`}</p>
      </div>
      {callable(lead, new Date().toISOString().slice(0, 10)) ? (
        <a href={`tel:${lead.phone}`} aria-label={`Call ${lead.name}`} className={actionBtn}>
          <Phone aria-hidden className="size-4" /> <span className="hidden sm:inline">Call</span>
        </a>
      ) : (
        <Link href={`/leads/${lead.id}`} aria-label={`Open ${lead.name}`} className={actionBtn}>Open</Link>
      )}
    </>
  );
}
