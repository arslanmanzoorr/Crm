"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Lead } from "@/lib/data";
import { Chip, LeadAvatar, NotchCard, ScoreDots, scoreLabel } from "./ui";

const filters = ["All", "Hot", "Warm", "Cold"] as const;
type Filter = (typeof filters)[number];

export const pill = (on: boolean) =>
  `flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm transition duration-150 ${on ? "bg-surface-light text-on-light" : "bg-surface-2 text-ink/80 hover:text-accent"}`;

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <NotchCard label={`Open ${lead.name}`} href={`/leads/${lead.id}`}>
      <LeadAvatar id={lead.id} name={lead.name} size={52} />
      <h3 className="mt-4 truncate pr-2 text-xl font-medium">{lead.name}</h3>
      <p className="line-clamp-2 text-sm text-muted">{lead.headline}</p>

      <p className="mt-3 rounded-2xl bg-surface-1 px-3 py-2 text-xs text-ink/80">
        <span className="text-accent">AI ·</span> {lead.nextAction || lead.intent}
        <br />
        <span className="line-clamp-1 text-muted">Last: {lead.lastTouch}</span>
      </p>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] text-muted">Source</p>
          <div className="flex flex-wrap gap-1.5">
            {lead.sources.length ? lead.sources.map((s) => <Chip key={s}>{s}</Chip>) : <span className="text-xs text-muted">Unknown</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1.5 flex items-center justify-end gap-1 text-[11px] text-muted">
            {lead.score >= 80 && <Flame aria-hidden className="size-3 text-score-2" />}
            {scoreLabel(lead.score)} · {lead.score}
          </p>
          <ScoreDots score={lead.score} />
        </div>
      </div>
    </NotchCard>
  );
}

/** Workspace: the three leads most worth a call, by score. */
export function TopLeads({ leads }: { leads: Lead[] }) {
  const top = [...leads].sort((a, b) => b.score - a.score).slice(0, 3);
  return (
    <section aria-labelledby="top-leads" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="top-leads" className="text-xl">Hottest leads</h2>
        <Link href="/leads" className="text-sm text-muted hover:text-accent">All {leads.length} leads →</Link>
      </div>
      {top.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{top.map((l) => <LeadCard key={l.id} lead={l} />)}</div>
      ) : (
        <p className="rounded-card bg-surface-2 p-6 text-sm text-muted">No leads yet. <Link href="/leads/new" className="text-accent underline">Add your first lead</Link>.</p>
      )}
    </section>
  );
}

/** Leads page: search + temperature filter over every lead. */
export function LeadList({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = leads
    .filter((l) => (filter === "All" || scoreLabel(l.score) === filter) && `${l.name} ${l.headline} ${l.email} ${l.phone}`.toLowerCase().includes(needle))
    .sort((a, b) => b.score - a.score);
  const count = (f: Filter) => (f === "All" ? leads.length : leads.filter((l) => scoreLabel(l.score) === f).length);

  return (
    <section aria-label="Lead list" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, area, phone…"
          aria-label="Search leads"
          className="min-h-11 w-full rounded-full bg-surface-2 px-4 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent sm:w-72"
        />
        <div role="group" aria-label="Filter by temperature" className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={pill(filter === f)}>
              {f === "Hot" && <Flame aria-hidden className="size-3.5 text-score-2" />}
              {f} <span className="text-xs opacity-70">{count(f)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{shown.length} leads shown</p>
      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((l) => <LeadCard key={l.id} lead={l} />)}</div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-6 text-sm">
          <p>No leads match{needle && <> “{q.trim()}”</>}{filter !== "All" && <> in {filter}</>}.</p>
          <button type="button" onClick={() => { setQ(""); setFilter("All"); }} className={pill(false)}>Clear search and filter</button>
        </div>
      )}
    </section>
  );
}
