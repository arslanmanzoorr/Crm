"use client";

import { CalendarDays, CircleAlert, Handshake, Search } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import type { Task } from "@/lib/data";
import { openPalette } from "./command-palette";
import { Avatar, AvatarStack } from "./ui";

const DAY_START = 8 * 60; // 8:00
const DAY_END = 20 * 60; // 20:00
const minutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
const pct = (min: number) => ((min - DAY_START) / (DAY_END - DAY_START)) * 100;
const hhmm = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const HOURS = [8, 10, 12, 14, 16, 18, 20];

// Minute-resolution clock; null during SSR so server and client markup agree.
const tick = (cb: () => void) => {
  const t = setInterval(cb, 15_000);
  return () => clearInterval(t);
};
export function useNow() {
  const min = useSyncExternalStore(tick, () => Math.floor(Date.now() / 60_000), () => null);
  return min === null ? null : new Date(min * 60_000);
}

/**
 * Today's open tasks on an 8am–8pm rail with hour marks. Past hours dim, a lime line marks now (only during working
 * hours, where it is true), and each task sits at its time as the lead's avatar.
 */
export function DayRail({ tasks }: { tasks: Task[] }) {
  const now = useNow();
  if (!now) return <div className="h-16 rounded-card bg-surface-1" />;
  const today = tasks.filter((t) => !t.done && t.dueAt && new Date(t.dueAt).toDateString() === now.toDateString());
  const inHours = (m: number) => m >= DAY_START && m <= DAY_END;
  const pinned = today.filter((t) => inHours(minutes(new Date(t.dueAt!))));
  const outside = today.length - pinned.length;
  const nowPct = Math.min(100, Math.max(0, pct(minutes(now))));
  return (
    <section aria-label="Today's schedule" className="flex flex-col gap-1.5">
      <div className="relative h-12 overflow-hidden rounded-full bg-surface-1">
        {/* the part of the working day already gone */}
        <span aria-hidden className="absolute inset-y-0 left-0 bg-surface-2" style={{ width: `${nowPct}%` }} />
        {HOURS.slice(1, -1).map((h) => <span key={h} aria-hidden className="absolute inset-y-3 w-px bg-line/10" style={{ left: `${pct(h * 60)}%` }} />)}
        {inHours(minutes(now)) && <span aria-hidden className="absolute inset-y-1.5 w-0.5 rounded-full bg-accent" style={{ left: `${nowPct}%` }} />}
        {pinned.map((t) => {
          const d = new Date(t.dueAt!);
          return (
            <Link key={t.id} href={t.contactId ? `/leads/${t.contactId}` : "/"}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface-1 transition hover:scale-110"
              style={{ left: `${Math.min(97, Math.max(3, pct(minutes(d))))}%` }}
              aria-label={`${hhmm(d)}: ${t.title}${t.contact ? ` with ${t.contact}` : ""}`} title={`${hhmm(d)} · ${t.title}`}>
              <AvatarStack names={[t.contact || t.title]} size={30} />
            </Link>
          );
        })}
        {today.length === 0 && <span className="absolute inset-0 grid place-items-center px-4 text-sm text-muted"><span className="truncate rounded-full bg-surface-1 px-3 py-1">Nothing booked between 8am and 8pm</span></span>}
        {outside > 0 && pinned.length === 0 && <span className="absolute inset-0 grid place-items-center px-4 text-sm text-muted"><span className="truncate rounded-full bg-surface-1 px-3 py-1">{outside} outside 8am–8pm</span></span>}
      </div>
      <div aria-hidden className="relative h-4 text-[11px] text-muted">
        {HOURS.map((h) => (
          <span key={h} className="absolute -translate-x-1/2 tabular-nums first:translate-x-0 last:-translate-x-full" style={{ left: `${pct(h * 60)}%` }}>
            {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
          </span>
        ))}
      </div>
    </section>
  );
}

export function greeting(h: number) {
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** The day at a glance: counts that need the agent today, each one a link to where it is handled. */
export type DayBrief = { showings: number; closing: number };

function Chip({ href, tone, icon, children }: { href: string; tone: "alert" | "accent" | "plain"; icon: ReactNode; children: ReactNode }) {
  const c = tone === "alert" ? "bg-score-1/12 text-score-1 hover:bg-score-1/20" : tone === "accent" ? "bg-accent/12 text-accent-ink hover:bg-accent/20" : "bg-surface-2 text-ink hover:bg-surface-3";
  return <Link href={href} className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${c}`}>{icon}{children}</Link>;
}

export function Header({ name, tasks, brief }: { name: string; tasks: Task[]; brief: DayBrief | null }) {
  const now = useNow();
  const overdue = now ? tasks.filter((t) => !t.done && t.dueAt && new Date(t.dueAt) < now).length : 0;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return (
    <header data-tour="header" className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl font-light sm:text-5xl">{now ? greeting(now.getHours()) : "Hello"}, {name.split(" ")[0]}</h1>
          <p className="mt-2 text-muted">{now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : " "}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" data-tour="search" onClick={openPalette} aria-label="Search (⌘K)" className="grid size-11 place-items-center rounded-full bg-surface-2 hover:text-accent-ink md:hidden">
            <Search aria-hidden className="size-5" />
          </button>
          <Link href="/account" aria-label="Account" className="rounded-full"><Avatar name={name} size={44} /></Link>
        </div>
      </div>
      {(overdue > 0 || (brief && (brief.showings > 0 || brief.closing > 0))) && (
        <nav aria-label="Needs you today" className="flex flex-wrap gap-2">
          {overdue > 0 && <Chip href="#today" tone="alert" icon={<CircleAlert aria-hidden className="size-4" />}>{plural(overdue, "overdue task")}</Chip>}
          {brief && brief.showings > 0 && <Chip href="/showings" tone="plain" icon={<CalendarDays aria-hidden className="size-4" />}>{plural(brief.showings, "showing")} in 24 hours</Chip>}
          {brief && brief.closing > 0 && <Chip href="/deals" tone="accent" icon={<Handshake aria-hidden className="size-4" />}>{plural(brief.closing, "deal")} closing in 30 days</Chip>}
        </nav>
      )}
      <DayRail tasks={tasks} />
    </header>
  );
}
