"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Task } from "@/lib/data";
import { Avatar, AvatarStack } from "./ui";

const DAY_START = 8 * 60; // 8:00
const DAY_END = 20 * 60; // 20:00
const minutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
const pct = (min: number) => Math.min(97, Math.max(3, ((min - DAY_START) / (DAY_END - DAY_START)) * 100));
// Minute-resolution clock; null during SSR so server and client markup agree.
const tick = (cb: () => void) => {
  const t = setInterval(cb, 15_000);
  return () => clearInterval(t);
};
function useNow() {
  const min = useSyncExternalStore(tick, () => Math.floor(Date.now() / 60_000), () => null);
  return min === null ? null : new Date(min * 60_000);
}
const hhmm = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** Lime timeline of today's open tasks with a live "now" marker. */
export function ScheduleTimeline({ tasks }: { tasks: Task[] }) {
  const now = useNow();
  if (!now) return <div className="h-14 min-w-0 flex-1 rounded-full bg-surface-1" />;
  const today = tasks.filter((t) => !t.done && t.dueAt && new Date(t.dueAt).toDateString() === now.toDateString());
  return (
    <section aria-label="Today's schedule" className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-surface-1 p-1.5 pr-4">
      <span className="hidden shrink-0 rounded-full bg-surface-light px-4 py-2.5 text-sm font-medium text-on-light sm:block">
        Today · {today.length}
      </span>
      <div className="relative h-11 min-w-0 flex-1 rounded-full bg-accent/90">
        {today.map((t) => {
          const d = new Date(t.dueAt!);
          return (
            <Link key={t.id} href={t.contactId ? `/leads/${t.contactId}` : "/"} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct(minutes(d))}%` }} title={`${hhmm(d)} · ${t.title}${t.contact ? ` · ${t.contact}` : ""}`}>
              <AvatarStack names={[t.contact || t.title]} size={30} />
            </Link>
          );
        })}
        <span className="absolute -top-1 bottom-[-4px] w-0.5 bg-on-light" style={{ left: `${pct(minutes(now))}%` }}>
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-on-light px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-accent">{hhmm(now)}</span>
        </span>
      </div>
    </section>
  );
}

export function Header({ name, kpis, tasks }: { name: string; kpis: { label: string; value: number; accent?: boolean }[]; tasks: Task[] }) {
  const h = useNow()?.getHours();
  const greet = h === undefined ? "Hello" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <ScheduleTimeline tasks={tasks} />
        <Link href="/leads" aria-label="Search leads" title="Search leads" className="hidden size-11 shrink-0 place-items-center rounded-full bg-surface-3 hover:text-accent sm:grid">
          <Search className="size-5" />
        </Link>
        <Avatar name={name} size={44} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm text-muted">{greet}, {name.split(" ")[0]}</p>
          <h1 className="text-4xl font-light tracking-[0.2em] uppercase sm:text-5xl">W<span className="text-accent">o</span>rkspace</h1>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {kpis.map((k) => (
            <div key={k.label} className="flex items-baseline gap-2">
              <dd className={`text-5xl font-light tabular-nums ${k.accent ? "text-accent" : ""}`}>{k.value}</dd>
              <dt className="max-w-[5rem] text-xs leading-tight text-muted">{k.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
