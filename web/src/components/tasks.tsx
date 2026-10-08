"use client";

import { Building2, Check, FileBarChart, Mail, Phone, Video } from "lucide-react";
import { useState, useTransition } from "react";
import { setTaskDone } from "@/lib/actions";
import type { Lead, Task } from "@/lib/data";
import { LocalTime } from "./local-time";
import { TaskForm } from "./task-form";
import { Avatar, NotchCard } from "./ui";

const kindIcon = { call: Phone, video: Video, email: Mail, showing: Building2, cma: FileBarChart };
const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();
const overdue = (t: Task) => !t.done && !!t.dueAt && new Date(t.dueAt) < new Date();

function DoneToggle({ task, className = "" }: { task: Task; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
      aria-pressed={task.done}
      disabled={pending || !task.dueAt}
      onClick={() => start(() => setTaskDone(task.id, !task.done))}
      className={`grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-current transition ${task.done ? "bg-accent text-on-light ring-accent" : "opacity-70 hover:opacity-100"} ${className}`}
    >
      {task.done && <Check className="size-4" />}
    </button>
  );
}

/** Contact action for a task: tel:/mailto: so "Start" actually starts something. */
function StartLink({ task, dark }: { task: Task; dark: boolean }) {
  const href = task.kind === "email" ? (task.email && `mailto:${task.email}`) : task.phone && `tel:${task.phone}`;
  if (!href) return null;
  const Icon = kindIcon[task.kind];
  return (
    <a href={href} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${dark ? "bg-on-light text-ink hover:bg-black" : "bg-surface-light text-on-light hover:bg-white"}`}>
      <Icon className="size-4" /> Start
    </a>
  );
}

function TaskCard({ task }: { task: Task }) {
  const Icon = kindIcon[task.kind];
  const tone = task.priority && !task.done ? "accent" : "dark";
  const sub = tone === "accent" ? "text-on-light/60" : "text-muted";
  return (
    <NotchCard tone={tone} label={`Open ${task.contact || task.title}`} href={task.contactId ? `/leads/${task.contactId}` : "#"} className={`w-72 shrink-0 snap-start ${task.done ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 pr-12">
        {task.contact ? <Avatar name={task.contact} size={36} /> : <DoneToggle task={task} />}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{task.contact || "No lead"}</p>
          <p className={`truncate text-xs ${sub}`}>{task.contactRole}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Icon className="size-5 shrink-0" />
        <h3 className={`truncate text-2xl font-medium ${task.done ? "line-through" : ""}`}>{task.title}</h3>
      </div>
      <p className={`mt-1 text-sm ${overdue(task) ? "text-score-1" : sub}`}>
        {task.dueAt ? <LocalTime ts={task.dueAt} opts={{ weekday: "short", hour: "numeric", minute: "2-digit" }} /> : task.when}
        {overdue(task) && " · overdue"}
      </p>
      {task.note && <p className={`mt-4 line-clamp-3 rounded-2xl px-3 py-2 text-xs ${tone === "accent" ? "bg-on-light/10" : "bg-surface-1 text-ink/80"}`}>{task.note}</p>}
      <div className="mt-4 flex items-center justify-between gap-2">
        {task.priority ? <span className="rounded-full bg-on-light px-3 py-1 text-xs font-medium text-accent">AI suggested</span> : <span />}
        <div className="flex items-center gap-2">
          {!task.done && <StartLink task={task} dark={tone === "accent"} />}
          {task.contact && <DoneToggle task={task} />}
        </div>
      </div>
    </NotchCard>
  );
}

/** Compact list (lead page). */
export function TaskList({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return <p className="text-sm text-muted">No tasks for this lead.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((t) => (
        <li key={t.id} className={`flex items-center gap-3 rounded-2xl bg-surface-1 px-3 py-2 ${t.done ? "opacity-50" : ""}`}>
          <DoneToggle task={t} />
          <span className={`flex-1 text-sm ${t.done ? "line-through" : ""}`}>{t.title}{t.priority && <span className="text-accent"> · AI</span>}</span>
          <span className={`text-xs ${overdue(t) ? "text-score-1" : "text-muted"}`}>{t.dueAt && <LocalTime ts={t.dueAt} />}</span>
        </li>
      ))}
    </ul>
  );
}

export function DayTasks({ tasks, leads }: { tasks: Task[]; leads: Lead[] }) {
  const [view, setView] = useState<"open" | "today" | "done">("open");
  const shown = tasks.filter((t) => (view === "done" ? t.done : !t.done && (view === "open" || isToday(t.dueAt) || overdue(t))));
  return (
    <section aria-labelledby="day-tasks" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="day-tasks" className="text-xl">Tasks <sup className="text-xs text-muted">{tasks.filter((t) => !t.done).length}</sup></h2>
        <div className="flex gap-2">
          {([["open", "Open"], ["today", "Today + overdue"], ["done", "Done"]] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
              className={`rounded-full px-4 py-2 text-sm transition duration-150 ${view === v ? "bg-surface-light text-on-light" : "bg-surface-2 text-ink/80 hover:text-accent"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <TaskForm leads={leads.map(({ id, name }) => ({ id, name }))} />
      <div className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {shown.map((t) => <TaskCard key={t.id} task={t} />)}
        {shown.length === 0 && <p className="py-6 text-sm text-muted">Nothing here. {view !== "done" && "Add a task above, or run AI analysis on a lead."}</p>}
      </div>
    </section>
  );
}
