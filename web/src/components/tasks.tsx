"use client";

import { Building2, Check, FileBarChart, Mail, Phone, Video } from "lucide-react";
import { useState, useTransition } from "react";
import { setTaskDone } from "@/lib/actions";
import type { Task } from "@/lib/data";
import { pill } from "./leads";
import { LocalTime } from "./local-time";
import { TaskForm } from "./task-form";
import { Avatar, NotchCard } from "./ui";

const kindIcon = { call: Phone, video: Video, email: Mail, showing: Building2, cma: FileBarChart };
const kindLabel = { call: "Call", video: "Video call", email: "Email", showing: "Showing", cma: "CMA" };
const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();
const overdue = (t: Task) => !t.done && !!t.dueAt && new Date(t.dueAt) < new Date();

/** Check-off control. Optimistic: the check fills immediately, the server catches up. */
export function DoneToggle({ task }: { task: Task }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const done = optimistic ?? task.done;
  return (
    <button
      type="button"
      aria-label={done ? `Reopen: ${task.title}` : `Mark done: ${task.title}`}
      aria-pressed={done}
      disabled={pending || !task.dueAt}
      onClick={() => {
        setOptimistic(!done);
        start(async () => {
          await setTaskDone(task.id, !done);
          setOptimistic(null);
        });
      }}
      className={`relative z-10 grid size-11 shrink-0 place-items-center rounded-full transition duration-200 ${done ? "bg-accent text-on-light" : "ring-2 ring-current/40 ring-inset hover:ring-current"}`}
    >
      {done && <Check aria-hidden className="size-5 animate-pop" />}
    </button>
  );
}

/** Contact action for a task: tel:/mailto: only when the lead consented (db.ts blanks the rest). */
function StartLink({ task, onAccent }: { task: Task; onAccent: boolean }) {
  const href = task.kind === "email" ? task.email && `mailto:${task.email}` : task.phone && `tel:${task.phone}`;
  if (!href) return null;
  const Icon = kindIcon[task.kind];
  return (
    <a
      href={href}
      className={`relative z-10 flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${onAccent ? "bg-on-light text-ink hover:bg-black" : "bg-surface-light text-on-light hover:bg-white"}`}
    >
      <Icon aria-hidden className="size-4" /> {task.kind === "email" ? "Email" : "Call"}
    </a>
  );
}

function TaskCard({ task }: { task: Task }) {
  const Icon = kindIcon[task.kind];
  const tone = task.priority && !task.done ? "accent" : "dark";
  const sub = tone === "accent" ? "text-on-light/70" : "text-muted";
  const late = overdue(task);
  return (
    <NotchCard tone={tone} label={`Open ${task.contact}`} href={task.contactId ? `/leads/${task.contactId}` : undefined} className="transition-opacity">
      <div className="flex items-center gap-3 pr-12">
        {task.contact ? <Avatar name={task.contact} size={36} /> : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{task.contact || "General task"}</p>
          <p className={`truncate text-xs ${sub}`}>{task.contactRole || kindLabel[task.kind]}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <Icon aria-hidden className="size-5 shrink-0" />
        <h3 className={`truncate text-2xl font-medium ${task.done ? "text-muted line-through" : ""}`}>{task.title}</h3>
      </div>
      <p className={`mt-1 text-sm ${sub}`}>
        {late && <span className={`mr-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${tone === "accent" ? "bg-on-light text-score-1" : "bg-score-1/15 text-score-1"}`}>Overdue</span>}
        {task.dueAt ? <LocalTime ts={task.dueAt} opts={{ weekday: "short", hour: "numeric", minute: "2-digit" }} /> : task.when}
      </p>
      {task.note && <p className={`mt-4 line-clamp-3 rounded-2xl px-3 py-2 text-xs ${tone === "accent" ? "bg-on-light/10" : "bg-surface-1 text-ink/80"}`}>{task.note}</p>}
      <div className="mt-4 flex items-center justify-between gap-2">
        {task.priority ? <span className="rounded-full bg-on-light px-3 py-1 text-xs font-medium text-accent">Suggested by AI</span> : <span />}
        <div className="flex items-center gap-2">
          {!task.done && <StartLink task={task} onAccent={tone === "accent"} />}
          <DoneToggle task={task} />
        </div>
      </div>
    </NotchCard>
  );
}

/** Compact list (lead page). */
export function TaskList({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return <p className="text-sm text-muted">No tasks for this lead yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface-1 py-1.5 pr-3 pl-1.5">
          <DoneToggle task={t} />
          <span className={`flex-1 text-sm ${t.done ? "text-muted line-through" : ""}`}>
            {t.title}
            {t.priority && <span className="text-accent"> · AI</span>}
          </span>
          <span className={`text-xs ${overdue(t) ? "text-score-1" : "text-muted"}`}>
            {overdue(t) && "Overdue · "}
            {t.dueAt && <LocalTime ts={t.dueAt} />}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DayTasks({ tasks, leads }: { tasks: Task[]; leads: { id: string; name: string }[] }) {
  const [view, setView] = useState<"open" | "today" | "done">("open");
  const shown = tasks.filter((t) => (view === "done" ? t.done : !t.done && (view === "open" || isToday(t.dueAt) || overdue(t))));
  return (
    <section aria-labelledby="day-tasks" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="day-tasks" className="text-xl">Tasks</h2>
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {([["open", "Open"], ["today", "Today and overdue"], ["done", "Done"]] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={pill(view === v)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <TaskForm leads={leads} />
      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((t) => <TaskCard key={t.id} task={t} />)}</div>
      ) : (
        <p className="rounded-card bg-surface-2 p-6 text-sm text-muted">
          {view === "done" ? "Nothing finished in the last day and a half." : "No open tasks. Add one above, or run AI analysis on a lead to have it plan the next step."}
        </p>
      )}
    </section>
  );
}
