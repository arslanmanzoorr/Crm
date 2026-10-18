"use client";

import { Check, ChevronRight, Compass } from "lucide-react";
import Link from "next/link";
import type { QuestId } from "@/lib/tour";
import { startTour } from "./tour";

type Quest = { id: QuestId; title: string; href: string; done: boolean };

/** Getting started: small real tasks that tick themselves off. Gone once all are done (or hide it in Customize). */
export function Quests({ quests }: { quests: Quest[] }) {
  const done = quests.filter((q) => q.done).length;
  if (!quests.length || done === quests.length) return null;
  const pct = done / quests.length;
  return (
    <section data-tour="quests" aria-labelledby="quests" className="flex flex-col gap-4 rounded-card bg-surface-2 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <svg aria-hidden viewBox="0 0 36 36" className="size-12 shrink-0 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-surface-3" />
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-accent transition-[stroke-dashoffset] duration-700"
            strokeDasharray={94.25} strokeDashoffset={94.25 * (1 - pct)} />
        </svg>
        <div className="min-w-48 flex-1">
          <h2 id="quests" className="text-xl">Getting started</h2>
          <p className="text-sm text-muted">{done} of {quests.length} done. Each one ticks itself off when you do it.</p>
        </div>
        <button type="button" onClick={startTour} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full sm:w-auto bg-surface-3 px-4 text-sm hover:bg-surface-light hover:text-on-light">
          <Compass aria-hidden className="size-4" /> Take the tour
        </button>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {quests.map((q) => (
          <li key={q.id}>
            {q.done ? (
              <span className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-muted">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-on-light"><Check aria-hidden className="size-3.5" /></span>
                <span className="line-through decoration-line/30">{q.title}</span><span className="sr-only"> (done)</span>
              </span>
            ) : (
              <Link href={q.href} className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface-1 px-3 hover:bg-surface-3">
                <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-line/25" />
                <span className="flex-1">{q.title}</span>
                <ChevronRight aria-hidden className="size-4 text-muted" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
