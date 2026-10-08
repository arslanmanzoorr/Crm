"use client";

import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import type { Lead, Task } from "@/lib/data";
import { useNow } from "./header";
import { LocalTime } from "./local-time";
import { DoneToggle } from "./tasks";
import { Avatar } from "./ui";

type Item =
  | { kind: "task"; task: Task; overdue: boolean }
  | { kind: "lead"; lead: Lead };

const callable = (l: Lead) => !!l.phone && !!l.consent?.call && !l.consent?.dnc;

/** "Who to call today": overdue work first, then today's tasks, then hot leads nobody has planned a step for. */
export function Today({ leads, tasks }: { leads: Lead[]; tasks: Task[] }) {
  const now = useNow();
  if (!now) return <div className="h-40 rounded-card bg-surface-2" />;

  const open = tasks.filter((t) => !t.done && t.dueAt);
  const overdue = open.filter((t) => new Date(t.dueAt!) < now);
  const today = open.filter((t) => new Date(t.dueAt!) >= now && new Date(t.dueAt!).toDateString() === now.toDateString());
  const planned = new Set(open.map((t) => t.contactId));
  const hot = leads.filter((l) => l.score >= 80 && !planned.has(l.id) && !["Closed", "Lost"].includes(l.stage ?? ""));

  const items: Item[] = [
    ...overdue.map((task) => ({ kind: "task" as const, task, overdue: true })),
    ...today.map((task) => ({ kind: "task" as const, task, overdue: false })),
    ...hot.map((lead) => ({ kind: "lead" as const, lead })),
  ].slice(0, 6);

  const summary = [
    `${today.length} due today`,
    overdue.length ? `${overdue.length} overdue` : null,
    `${leads.filter((l) => l.score >= 80).length} hot leads`,
  ].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="today" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today" className="text-xl">Today</h2>
        <p className="text-sm text-muted">{summary}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-card bg-surface-2 p-6 text-sm text-muted">
          You&apos;re clear. Add a task below, or open a lead and run <span className="text-ink">Analyze with AI</span> to plan the next step.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {items.map((it, i) => (
            <li key={it.kind === "task" ? it.task.id : it.lead.id} style={{ animationDelay: `${i * 40}ms` }} className="flex animate-rise items-center gap-3 px-4 py-3 sm:px-5">
              {it.kind === "task" ? <TaskRow {...it} /> : <LeadRow lead={it.lead} />}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const actionBtn = "flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-surface-light px-4 text-sm font-medium text-on-light hover:bg-white";

function TaskRow({ task, overdue }: { task: Task; overdue: boolean }) {
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
          {overdue ? "Overdue · " : ""}
          <LocalTime ts={task.dueAt!} opts={{ weekday: "short", hour: "numeric", minute: "2-digit" }} />
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
          {lead.name} <span className="font-normal text-score-2">· Hot {lead.score}</span>
        </p>
        <p className="truncate text-sm text-muted">{lead.nextAction || `No next step yet · ${lead.intent}`}</p>
      </div>
      {callable(lead) ? (
        <a href={`tel:${lead.phone}`} aria-label={`Call ${lead.name}`} className={actionBtn}>
          <Phone aria-hidden className="size-4" /> <span className="hidden sm:inline">Call</span>
        </a>
      ) : (
        <Link href={`/leads/${lead.id}`} aria-label={`Open ${lead.name}`} className={actionBtn}>Open</Link>
      )}
    </>
  );
}
