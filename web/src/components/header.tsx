"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { Task } from "@/lib/data";
import { openPalette } from "./command-palette";
import { Avatar, AvatarStack } from "./ui";

const DAY_START = 8 * 60; // 8:00
const DAY_END = 20 * 60; // 20:00
const minutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
const pct = (min: number) => ((min - DAY_START) / (DAY_END - DAY_START)) * 100;
const hhmm = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// Minute-resolution clock; null during SSR so server and client markup agree.
const tick = (cb: () => void) => {
  const t = setInterval(cb, 15_000);
  return () => clearInterval(t);
};
export function useNow() {
  const min = useSyncExternalStore(tick, () => Math.floor(Date.now() / 60_000), () => null);
  return min === null ? null : new Date(min * 60_000);
}

/** Today's open tasks on an 8am–8pm track. The "now" line only shows during working hours, where it is true. */
export function ScheduleTimeline({ tasks }: { tasks: Task[] }) {
  const now = useNow();
  if (!now) return <div className="h-14 min-w-0 flex-1 rounded-full bg-surface-1" />;
  const today = tasks.filter((t) => !t.done && t.dueAt && new Date(t.dueAt).toDateString() === now.toDateString());
  const inHours = (m: number) => m >= DAY_START && m <= DAY_END;
  const pinned = today.filter((t) => inHours(minutes(new Date(t.dueAt!))));
  const outside = today.length - pinned.length;
  return (
    <section aria-label="Today's schedule" className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-surface-1 p-1.5 pr-4">
      <span className="shrink-0 rounded-full bg-surface-light px-4 py-2.5 text-sm font-medium text-on-light">
        {hhmm(now)}
      </span>
      <div className="relative h-11 min-w-0 flex-1 overflow-hidden rounded-full bg-accent/90 text-on-light">
        {pinned.map((t) => {
          const d = new Date(t.dueAt!);
          return (
            <Link
              key={t.id}
              href={t.contactId ? `/leads/${t.contactId}` : "/"}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${Math.min(96, Math.max(4, pct(minutes(d))))}%` }}
              aria-label={`${hhmm(d)}: ${t.title}${t.contact ? ` with ${t.contact}` : ""}`}
              title={`${hhmm(d)} · ${t.title}`}
            >
              <AvatarStack names={[t.contact || t.title]} size={30} />
            </Link>
          );
        })}
        {inHours(minutes(now)) && <span aria-hidden className="absolute inset-y-1 w-0.5 rounded-full bg-on-light" style={{ left: `${pct(minutes(now))}%` }} />}
        {today.length === 0 && <span className="absolute inset-0 grid place-items-center text-sm font-medium">Nothing scheduled today</span>}
        {outside > 0 && pinned.length === 0 && <span className="absolute inset-0 grid place-items-center text-sm font-medium">{outside} outside 8am–8pm</span>}
      </div>
    </section>
  );
}

export function greeting(h: number) {
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Header({ name, tasks }: { name: string; tasks: Task[] }) {
  const now = useNow();
  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <ScheduleTimeline tasks={tasks} />
        <button type="button" onClick={openPalette} aria-label="Search (⌘K)" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 hover:text-accent md:hidden">
          <Search aria-hidden className="size-5" />
        </button>
        <Link href="/account" aria-label="Account" className="shrink-0 rounded-full">
          <Avatar name={name} size={44} />
        </Link>
      </div>
      <div>
        <p className="text-sm text-muted">{now ? greeting(now.getHours()) : "Hello"}, {name.split(" ")[0]}</p>
        <h1 className="text-4xl font-light tracking-[0.2em] uppercase sm:text-5xl">
          W<span className="text-accent">o</span>rkspace
        </h1>
      </div>
    </header>
  );
}
