"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { Lead } from "@/lib/data";
import { Chip, LeadAvatar, NotchCard, ScoreDots, scoreLabel } from "./ui";

const filters = ["All", "Hot", "Warm", "Cold"] as const;
export type Filter = (typeof filters)[number];
const PAGE = 30; // keep in sync with db.ts PAGE

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
export function TopLeads({ leads, total }: { leads: Lead[]; total: number }) {
  const top = [...leads].sort((a, b) => b.score - a.score).slice(0, 3);
  return (
    <section aria-labelledby="top-leads" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="top-leads" className="text-xl">Hottest leads</h2>
        <Link href="/leads" className="text-sm text-muted hover:text-accent">All {total} leads →</Link>
      </div>
      {top.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{top.map((l) => <LeadCard key={l.id} lead={l} />)}</div>
      ) : (
        <p className="rounded-card bg-surface-2 p-6 text-sm text-muted">No leads yet. <Link href="/leads/new" className="text-accent underline">Add your first lead</Link>.</p>
      )}
    </section>
  );
}

type Counts = Record<Filter, number>;

/** Leads page. Search, filter and paging live in the URL and run in Postgres; this only drives the URL. */
export function LeadList({ leads, total, counts, q, temp, limit }: { leads: Lead[]; total: number; counts: Counts; q: string; temp: Filter; limit: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(q);
  const [sent, setSent] = useState(q); // last q this component pushed to the URL
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    // URL changed (e.g. Back button): mirror it in the box unless it's our own debounced search landing.
    setSeenQ(q);
    if (q !== sent) setText(q);
  }

  const go = useCallback((next: { q?: string; temp?: Filter; limit?: number }) => {
    const p = new URLSearchParams();
    const nq = next.q ?? q;
    setSent(nq);
    const nt = next.temp ?? temp;
    const nl = next.limit ?? PAGE;
    if (nq) p.set("q", nq);
    if (nt !== "All") p.set("temp", nt);
    if (nl > PAGE) p.set("show", String(nl));
    start(() => router.replace(`/leads${p.size ? `?${p}` : ""}`, { scroll: false }));
  }, [q, temp, router]);

  // Debounced server search as you type.
  useEffect(() => {
    if (text.trim() === q) return;
    const t = setTimeout(() => go({ q: text.trim() }), 250);
    return () => clearTimeout(t);
  }, [text, q, go]);

  return (
    <section aria-label="Lead list" aria-busy={pending} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search name, email, phone, area…"
          aria-label="Search leads"
          maxLength={80}
          className="min-h-11 w-full rounded-full bg-surface-2 px-4 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent sm:w-80"
        />
        <div role="group" aria-label="Filter by temperature" className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f} type="button" aria-pressed={temp === f} onClick={() => go({ temp: f })} className={pill(temp === f)}>
              {f === "Hot" && <Flame aria-hidden className="size-3.5 text-score-2" />}
              {f} <span className="text-xs opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{pending ? "Searching" : `${total} leads found`}</p>
      {leads.length ? (
        <>
          <div className={`grid gap-4 transition-opacity duration-150 sm:grid-cols-2 xl:grid-cols-3 ${pending ? "opacity-60" : ""}`}>
            {leads.map((l) => <LeadCard key={l.id} lead={l} />)}
          </div>
          {leads.length < total && (
            <button type="button" onClick={() => go({ limit: limit + PAGE })} disabled={pending} className={`${pill(false)} self-center`}>
              {pending ? "Loading…" : `Show more · ${total - leads.length} left`}
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-6 text-sm">
          <p>No leads match{q && <> “{q}”</>}{temp !== "All" && <> in {temp}</>}.</p>
          <button type="button" onClick={() => { setText(""); go({ q: "", temp: "All" }); }} className={pill(false)}>Clear search and filter</button>
        </div>
      )}
    </section>
  );
}
