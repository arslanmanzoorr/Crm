"use client";

import { Building2, FileBarChart, Mail, Phone, Plus, Video } from "lucide-react";
import { useState } from "react";
import { tasks, type Task } from "@/lib/data";
import { Avatar, IconButton, NotchCard } from "./ui";

const kindIcon = { call: Phone, video: Video, email: Mail, showing: Building2, cma: FileBarChart };

function TaskCard({ task, onStart }: { task: Task; onStart: (t: Task) => void }) {
  const Icon = kindIcon[task.kind];
  const tone = task.priority ? "accent" : "dark";
  const sub = task.priority ? "text-on-light/60" : "text-muted";
  return (
    <NotchCard tone={tone} label={`Open ${task.title}`} className="w-72 shrink-0 snap-start">
      <div className="flex items-center gap-3 pr-12">
        <Avatar name={task.contact} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{task.contact}</p>
          <p className={`truncate text-xs ${sub}`}>{task.contactRole}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Icon className="size-5" />
        <h3 className="text-2xl font-medium">{task.title}</h3>
      </div>
      <p className={`mt-1 text-sm ${sub}`}>{task.when}</p>

      <p className={`mt-4 rounded-2xl px-3 py-2 text-xs ${task.priority ? "bg-on-light/10" : "bg-surface-1 text-ink/80"}`}>
        {task.note}
      </p>

      <div className="mt-4 flex items-center justify-between">
        {task.priority ? (
          <span className="rounded-full bg-on-light px-3 py-1 text-xs font-medium text-accent">AI top priority</span>
        ) : (
          <span className={`text-xs ${sub}`}>{task.dueToday ? "Due today" : "Upcoming"}</span>
        )}
        {(task.kind === "call" || task.kind === "video") && (
          <button
            type="button"
            onClick={() => onStart(task)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              task.priority ? "bg-on-light text-ink hover:bg-black" : "bg-surface-light text-on-light hover:bg-white"
            }`}
          >
            <Icon className="size-4" /> Start
          </button>
        )}
      </div>
    </NotchCard>
  );
}

export function DayTasks({ onStartCall }: { onStartCall: (t: Task) => void }) {
  const [dueOnly, setDueOnly] = useState(false);
  const shown = tasks.filter((t) => !dueOnly || t.dueToday);

  return (
    <section aria-labelledby="day-tasks" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="day-tasks" className="text-xl">
          Your Day&apos;s Tasks <sup className="text-xs text-muted">{tasks.length}</sup>
        </h2>
        <div className="flex gap-2">
          {[
            ["All", false],
            ["Due today", true],
          ].map(([label, val]) => (
            <button
              key={label as string}
              type="button"
              aria-pressed={dueOnly === val}
              onClick={() => setDueOnly(val as boolean)}
              className={`rounded-full px-4 py-2 text-sm transition duration-150 ${
                dueOnly === val ? "bg-surface-light text-on-light" : "bg-surface-2 text-ink/80 hover:text-accent"
              }`}
            >
              {label as string}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-surface-light py-1.5 pr-5 pl-1.5 text-sm font-medium text-on-light hover:bg-white"
          >
            <span className="grid size-8 place-items-center rounded-full bg-on-light text-ink">
              <Plus className="size-4" />
            </span>
            New task
          </button>
        </div>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {shown.map((t) => (
          <TaskCard key={t.id} task={t} onStart={onStartCall} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <IconButton label="Start video call">
          <Video className="size-5" />
        </IconButton>
        <IconButton label="Click to call">
          <Phone className="size-5" />
        </IconButton>
        <IconButton label="Compose email">
          <Mail className="size-5" />
        </IconButton>
      </div>
    </section>
  );
}
