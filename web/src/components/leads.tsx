"use client";

import { Flame, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { leads, type Lead } from "@/lib/data";
import { Avatar, Chip, IconButton, NotchCard, ScoreDots, scoreLabel } from "./ui";

const filters = ["All", "Hot", "Warm", "Cold"] as const;
type Filter = (typeof filters)[number];

const matches = (l: Lead, f: Filter) =>
  f === "All" || (f === "Hot" ? l.score >= 80 : f === "Warm" ? l.score >= 50 && l.score < 80 : l.score < 50);

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <NotchCard label={`Open ${lead.name}`} className="w-72 shrink-0 snap-start">
      <Avatar name={lead.name} size={52} />
      <h3 className="mt-4 text-xl font-medium">{lead.name}</h3>
      <p className="text-sm text-muted">{lead.headline}</p>

      <p className="mt-3 rounded-2xl bg-surface-1 px-3 py-2 text-xs text-ink/80">
        <span className="text-accent">AI ·</span> {lead.intent}
        <br />
        <span className="text-muted">{lead.lastTouch}</span>
      </p>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="mb-1.5 text-[11px] text-muted">Source</p>
          <div className="flex flex-wrap gap-1.5">
            {lead.sources.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="mb-1.5 flex items-center justify-end gap-1 text-[11px] text-muted">
            {lead.score >= 80 && <Flame className="size-3 text-score-2" />}
            {scoreLabel(lead.score)} · {lead.score}
          </p>
          <ScoreDots score={lead.score} />
        </div>
      </div>
    </NotchCard>
  );
}

export function NewLeads() {
  const [filter, setFilter] = useState<Filter>("All");
  const shown = leads.filter((l) => matches(l, filter)).sort((a, b) => b.score - a.score);

  return (
    <section aria-labelledby="new-leads" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="new-leads" className="text-xl">
          New Leads <sup className="text-xs text-muted">{leads.length}</sup>
        </h2>
        <div role="tablist" aria-label="Filter leads" className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition duration-150 ${
                filter === f ? "bg-surface-light text-on-light" : "bg-surface-2 text-ink/80 hover:text-accent"
              }`}
            >
              {f === "Hot" && <Flame className="size-3.5 text-score-2" />}
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <IconButton label="Sort and filter">
            <SlidersHorizontal className="size-5" />
          </IconButton>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-surface-light py-1.5 pr-5 pl-1.5 text-sm font-medium text-on-light hover:bg-white"
          >
            <span className="grid size-8 place-items-center rounded-full bg-on-light text-ink">
              <Plus className="size-4" />
            </span>
            Add lead
          </button>
        </div>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {shown.map((l) => (
          <LeadCard key={l.id} lead={l} />
        ))}
        {shown.length === 0 && <p className="py-10 text-sm text-muted">No {filter.toLowerCase()} leads right now.</p>}
      </div>
    </section>
  );
}
