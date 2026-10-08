"use client";

import { ChevronDown, Moon } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { setStage } from "@/lib/actions";
import { STAGES, type Stage } from "@/lib/data";
import type { BoardCard, BoardColumn } from "@/lib/db";
import { Avatar, ScoreDots, scoreLabel } from "./ui";

const QUIET_DAYS = 14;
const DONE: Stage[] = ["Closed", "Lost"];

/** Days since the last logged touch, or null when the lead never had one. */
function quietDays(c: BoardCard, now: number) {
  if (!c.lastActivityAt) return null;
  return Math.floor((now - new Date(c.lastActivityAt).getTime()) / 864e5);
}

export function PipelineBoard({ columns }: { columns: BoardColumn[] }) {
  const [, start] = useTransition();
  const [err, setErr] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [now] = useState(() => Date.now());
  // Moves show immediately; when the server action finishes, fresh props replace the optimistic state.
  const [board, move] = useOptimistic(columns, (cols, { id, to }: { id: string; to: Stage }) => {
    const card = cols.flatMap((c) => c.cards).find((c) => c.id === id);
    if (!card || card.stage === to) return cols;
    return cols.map((col) => {
      if (col.stage === card.stage) return { ...col, count: col.count - 1, cards: col.cards.filter((c) => c.id !== id) };
      if (col.stage === to) return { ...col, count: col.count + 1, cards: [{ ...card, stage: to }, ...col.cards] };
      return col;
    });
  });

  function moveTo(id: string, to: Stage) {
    setErr("");
    start(async () => {
      move({ id, to });
      try {
        await setStage(id, to);
      } catch {
        setErr("Couldn't move that lead. It's back where it was; try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
      <p className="text-sm text-muted md:hidden">Swipe between stages. Use a card&apos;s stage menu to move it.</p>
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8">
        {board.map((col) => {
          const done = DONE.includes(col.stage);
          return (
            <section
              key={col.stage}
              aria-labelledby={`col-${col.stage}`}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); setOver(col.stage); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); if (dragId) moveTo(dragId, col.stage); setDragId(null); setOver(null); }}
              className={`flex w-[85vw] shrink-0 snap-start flex-col gap-2 rounded-card p-3 transition-colors duration-150 sm:w-72 ${over === col.stage ? "bg-accent/15 ring-2 ring-accent" : "bg-surface-1"}`}
            >
              <h2 id={`col-${col.stage}`} className={`flex items-baseline justify-between px-2 pt-1 text-sm font-medium ${done ? "text-muted" : ""}`}>
                {col.stage}
                <span className="text-xs font-normal text-muted">{col.count}</span>
              </h2>
              <ol className="flex flex-col gap-2">
                {col.cards.map((c) => {
                  const quiet = quietDays(c, now);
                  return (
                    <li
                      key={c.id}
                      draggable
                      onDragStart={(e) => { setDragId(c.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.id); }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      className={`animate-rise cursor-grab rounded-2xl bg-surface-2 p-3 active:cursor-grabbing ${dragId === c.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} size={32} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/leads/${c.id}`} className="block truncate text-sm font-medium hover:text-accent">{c.name}</Link>
                          <p className="truncate text-xs text-muted">{[c.type[0].toUpperCase() + c.type.slice(1), c.budget].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                      {!done && quiet !== null && quiet >= QUIET_DAYS && (
                        <p title={`No activity for ${quiet} days`} className="mt-2 flex w-fit items-center gap-1 rounded-full bg-score-2/15 px-2 py-0.5 text-xs text-score-2">
                          <Moon aria-hidden className="size-3" /> Quiet {quiet} days
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <ScoreDots score={c.score} /> {scoreLabel(c.score)}
                        </span>
                        <label className="relative">
                          <span className="sr-only">Move {c.name} to another stage</span>
                          <select
                            value={c.stage}
                            onChange={(e) => moveTo(c.id, e.target.value as Stage)}
                            className="min-h-11 appearance-none rounded-full bg-surface-1 py-0 pr-8 pl-3 text-xs text-muted outline-none hover:text-ink focus:text-ink focus:ring-2 focus:ring-accent"
                          >
                            {STAGES.map((s) => <option key={s} value={s}>{s === c.stage ? "Move…" : s}</option>)}
                          </select>
                          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted" />
                        </label>
                      </div>
                    </li>
                  );
                })}
                {col.cards.length === 0 && <li className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-muted">Drop a lead here</li>}
                {col.count > col.cards.length && (
                  <li><Link href="/leads" className="block px-2 py-2 text-xs text-muted hover:text-accent">+{col.count - col.cards.length} more in Leads</Link></li>
                )}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
