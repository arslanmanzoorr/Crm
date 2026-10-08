"use client";

import { Flame } from "lucide-react";
import { useState } from "react";
import { leads, type Lead } from "@/lib/data";
import { Avatar, Chip, NotchCard, ScoreDots, scoreLabel } from "./ui";

const filters = ["All", "Hot", "Warm", "Cold"] as const;
type Filter = (typeof filters)[number];

const matches = (l: Lead, f: Filter) =>
  f === "All" || (f === "Hot" ? l.score >= 80 : f === "Warm" ? l.score >= 50 && l.score < 80 : l.score < 50);

export function LeadCard({ lead, wrap = false }: { lead: Lead; wrap?: boolean }) {
  return (
    <NotchCard label={`Open ${lead.name}`} href={`/leads/${lead.id}`} className={wrap ? "" : "w-72 shrink-0 snap-start"}>
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

export function NewLeads({ wrap = false }: { wrap?: boolean }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [q, setQ] = useState("");
  const shown = leads
    .filter((l) => matches(l, filter) && `${l.name} ${l.headline}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.score - a.score);

  return (
    <section aria-labelledby="new-leads" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="new-leads" className="text-xl">
          {wrap ? "All Leads" : "New Leads"} <sup className="text-xs text-muted">{leads.length}</sup>
        </h2>
        {wrap && (
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads"
            aria-label="Search leads"
            className="rounded-full bg-surface-2 px-4 py-2 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
        )}
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
      </div>

      <div className={wrap ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2"}>
        {shown.map((l) => (
          <LeadCard key={l.id} lead={l} wrap={wrap} />
        ))}
        {shown.length === 0 && <p className="py-10 text-sm text-muted">No {filter.toLowerCase()} leads right now.</p>}
      </div>
    </section>
  );
}
