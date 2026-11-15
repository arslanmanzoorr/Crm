"use client";

import { Check, Flame, Mail, Phone, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { bulkDelete, bulkSetOwner, bulkSetStage } from "@/lib/actions";
import type { Member } from "@/lib/db";
import { STAGES, type Lead, type Stage } from "@/lib/data";
import { scrubbed } from "@/lib/consent";
import { useNow } from "./header";
import { Chip, LeadAvatar, NotchCard, ScoreDots, scoreLabel } from "./ui";

const filters = ["All", "Hot", "Warm", "Cold"] as const;
export type Filter = (typeof filters)[number];
const PAGE = 30; // keep in sync with db.ts PAGE

export const pill = (on: boolean) =>
  `flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm transition duration-150 ${on ? "bg-surface-light text-on-light" : "bg-surface-2 text-ink/80 hover:text-accent-ink"}`;

export function LeadCard({ lead, selected, onToggle, owner }: { lead: Lead; selected?: boolean; onToggle?: () => void; owner?: string }) {
  return (
    <NotchCard label={`Open ${lead.name}`} href={`/leads/${lead.id}`} className={selected ? "ring-2 ring-accent" : ""}>
      {onToggle && (
        <button
          type="button"
          role="checkbox"
          aria-checked={!!selected}
          aria-label={`Select ${lead.name}`}
          onClick={onToggle}
          className="absolute inset-0 z-20 rounded-card"
        >
          <span className={`absolute top-[54px] left-[54px] grid size-7 place-items-center rounded-full border-[3px] border-surface-2 transition duration-150 ${selected ? "bg-accent text-on-light" : "bg-surface-3 text-transparent"}`}>
            {selected && <Check aria-hidden className="size-4 animate-pop" />}
          </span>
        </button>
      )}
      <LeadAvatar id={lead.id} name={lead.name} size={52} />
      <h2 className="mt-4 truncate pr-2 text-xl font-medium">{lead.name}</h2>
      {owner !== undefined && <p className="text-xs text-muted">{owner ? `Owner: ${owner}` : "Unassigned"}</p>}
      <p className="line-clamp-2 text-sm text-muted">{lead.headline}</p>

      <p className="mt-3 rounded-2xl bg-surface-1 px-3 py-2 text-xs text-ink/80">
        <span className="text-accent-ink">AI ·</span> {lead.nextAction || lead.intent}
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

const TEMP_TONE: Record<string, string> = { Hot: "text-score-2", Warm: "text-score-3", Cold: "text-muted" };
const scoreTone = (s: number) => (s >= 80 ? "bg-score-2" : s >= 50 ? "bg-score-3" : "bg-surface-3");

/** "3d", "5h", "just now": how long since the last touch. */
function ago(iso: string | undefined, now: Date | null) {
  if (!iso || !now || isNaN(Date.parse(iso))) return null;
  const m = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 60_000));
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : m < 60 * 24 * 60 ? `${Math.floor(m / 1440)}d ago` : `${Math.floor(m / 43200)}mo ago`;
}

/** One lead as a scannable row: who, where they are, the next step, how hot, and the one action allowed now. */
function LeadRow({ lead, owner, selected, onToggle, now }: { lead: Lead; owner?: string; selected?: boolean; onToggle?: () => void; now: Date | null }) {
  const today = now?.toISOString().slice(0, 10) ?? "";
  const call = !!now && !!lead.phone && !lead.consent?.dnc && (!!lead.consent?.call || scrubbed(lead.consent?.dncCheckedOn, today));
  const mail = !call && !!lead.email && !lead.consent?.dnc;
  const last = ago(lead.activity[0]?.when, now);
  const first = lead.name.split(" ")[0];
  return (
    <li className={`group relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-3/60 sm:px-5 ${selected ? "bg-accent/10" : ""}`}>
      {onToggle ? (
        <>
          {/* In select mode the whole row is the checkbox; the circle sits where the avatar was. */}
          <button type="button" role="checkbox" aria-checked={!!selected} aria-label={`Select ${lead.name}`} onClick={onToggle} className="absolute inset-0 z-20" />
          <span aria-hidden className="grid size-11 shrink-0 place-items-center">
            <span className={`grid size-7 place-items-center rounded-full transition duration-150 ${selected ? "bg-accent text-on-light" : "bg-surface-3 text-transparent ring-1 ring-line/15"}`}>
              {selected && <Check className="size-4 animate-pop" />}
            </span>
          </span>
        </>
      ) : (
        <LeadAvatar id={lead.id} name={lead.name} size={44} />
      )}
      <div className="grid min-w-0 flex-1 items-center gap-x-6 gap-y-0.5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto]">
        <div className="min-w-0">
          <Link href={`/leads/${lead.id}`} className="block truncate font-medium after:absolute after:inset-0 hover:text-accent-ink">{lead.name}</Link>
          <p className="truncate text-sm text-muted">
            {lead.stage && <span className="text-ink/80">{lead.stage}</span>}
            {lead.stage && lead.headline && " · "}{lead.headline}
            {owner !== undefined && <> · {owner || "Unassigned"}</>}
          </p>
        </div>
        <div className="min-w-0 text-sm">
          <p className="truncate"><span className="text-accent-ink">Next</span> <span className="text-ink/90">{lead.nextAction || lead.intent}</span></p>
          <p className="hidden truncate text-muted md:block">{last ? `${last} · ` : ""}{lead.lastTouch}</p>
        </div>
        <p className="hidden items-center gap-2 text-sm md:flex" aria-label={`Score ${lead.score}, ${scoreLabel(lead.score)}`}>
          <span aria-hidden className={`size-2 rounded-full ${scoreTone(lead.score)}`} />
          <span className="w-7 text-right tabular-nums">{lead.score}</span>
        </p>
      </div>
      <span className={`shrink-0 text-sm tabular-nums md:hidden ${TEMP_TONE[scoreLabel(lead.score)]}`} aria-label={`Score ${lead.score}`}>{lead.score}</span>
      {!onToggle && (call || mail) && (
        <a href={call ? `tel:${lead.phone}` : `mailto:${lead.email}`} aria-label={`${call ? "Call" : "Email"} ${lead.name}`}
          className="relative z-10 hidden min-h-11 w-36 shrink-0 items-center justify-center gap-2 rounded-full bg-surface-3 px-4 text-sm font-medium transition duration-150 hover:bg-accent hover:text-on-light sm:flex">
          {call ? <Phone aria-hidden className="size-4 shrink-0" /> : <Mail aria-hidden className="size-4 shrink-0" />}<span className="truncate">{call ? "Call" : "Email"} {first}</span>
        </a>
      )}
      {/* Same width with or without an action, so the columns line up row to row. */}
      {!onToggle && !(call || mail) && <span aria-hidden className="hidden w-36 shrink-0 sm:block" />}
    </li>
  );
}

/** Workspace: the three leads most worth a call, by score. */
export function TopLeads({ leads, total }: { leads: Lead[]; total: number }) {
  const top = [...leads].sort((a, b) => b.score - a.score).slice(0, 3);
  return (
    <section aria-labelledby="top-leads" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="top-leads" className="text-xl">Hottest leads</h2>
        <Link href="/leads" className="text-sm text-muted hover:text-accent-ink">All {total} leads →</Link>
      </div>
      {top.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{top.map((l) => <LeadCard key={l.id} lead={l} />)}</div>
      ) : (
        <p className="rounded-card bg-surface-2 p-6 text-sm text-muted">No leads yet. <Link href="/leads/new" className="text-accent-ink underline">Add your first lead</Link>.</p>
      )}
    </section>
  );
}

type Counts = Record<Filter, number>;

/** Leads page. Search, filter and paging live in the URL and run in Postgres; this only drives the URL. */
type OwnerFilter = "" | "me" | "none";

export function LeadList({ leads, total, counts, q, temp, limit, owner = "", tag = "", members = [] }: {
  leads: Lead[]; total: number; counts: Counts; q: string; temp: Filter; limit: number;
  owner?: OwnerFilter; tag?: string; members?: Member[];
}) {
  const team = members.length > 1;
  const nameOf = (id?: string | null) => (id ? members.find((m) => m.userId === id)?.email.split("@")[0] ?? "" : "");
  const router = useRouter();
  const now = useNow();
  const [pending, start] = useTransition();
  const [text, setText] = useState(q);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState<{ error?: boolean; text: string } | null>(null);
  const [armed, setArmed] = useState(false);
  const toggle = (id: string) => {
    setArmed(false); // a changed selection must be re-confirmed before deleting
    setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const stopSelecting = () => { setSelecting(false); setPicked(new Set()); setArmed(false); };

  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setSelecting(false); setPicked(new Set()); setArmed(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting]);

  function runBulk(fn: () => Promise<string>) {
    setBulkMsg(null);
    start(async () => {
      try {
        setBulkMsg({ text: await fn() });
        stopSelecting();
      } catch (e) {
        setBulkMsg({ error: true, text: (e as Error).message || "That didn't work. Try again." });
      }
    });
  }
  const [sent, setSent] = useState(q); // last q this component pushed to the URL
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    // URL changed (e.g. Back button): mirror it in the box unless it's our own debounced search landing.
    setSeenQ(q);
    if (q !== sent) setText(q);
  }

  const go = useCallback((next: { q?: string; temp?: Filter; limit?: number; owner?: OwnerFilter; tag?: string }) => {
    const p = new URLSearchParams();
    const nq = next.q ?? q;
    setSent(nq);
    const nt = next.temp ?? temp;
    const nl = next.limit ?? PAGE;
    if (nq) p.set("q", nq);
    if (nt !== "All") p.set("temp", nt);
    if (nl > PAGE) p.set("show", String(nl));
    const no = next.owner ?? owner;
    const ng = next.tag ?? tag;
    if (no) p.set("owner", no);
    if (ng) p.set("tag", ng);
    start(() => router.replace(`/leads${p.size ? `?${p}` : ""}`, { scroll: false }));
  }, [q, temp, owner, tag, router]);

  // Debounced server search as you type.
  useEffect(() => {
    if (text.trim() === q) return;
    const t = setTimeout(() => go({ q: text.trim() }), 250);
    return () => clearTimeout(t);
  }, [text, q, go]);

  return (
    <section aria-label="Lead list" aria-busy={pending} className={`flex flex-col gap-4 ${selecting ? "pb-28" : ""}`}>
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
        {team && (
          <div role="group" aria-label="Filter by owner" className="flex flex-wrap gap-2">
            {([["", "Everyone"], ["me", "Mine"], ["none", "Unassigned"]] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={owner === v} onClick={() => go({ owner: v })} className={pill(owner === v)}>{l}</button>
            ))}
          </div>
        )}
        {tag && (
          <button type="button" onClick={() => go({ tag: "" })} className={`${pill(true)} gap-1`} aria-label={`Remove tag filter ${tag}`}>
            #{tag} <X aria-hidden className="size-3.5" />
          </button>
        )}
        {/* Temperature chips scroll sideways on a phone so Select stays on the same line. */}
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
          <div role="group" aria-label="Filter by temperature" className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto">
            {filters.map((f) => (
              <button key={f} type="button" aria-pressed={temp === f} onClick={() => go({ temp: f })} className={`${pill(temp === f)} shrink-0`}>
                {f === "Hot" && <Flame aria-hidden className="size-3.5 text-score-2" />}
                {f} <span className="text-xs opacity-70">{counts[f]}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => (selecting ? stopSelecting() : setSelecting(true))} aria-pressed={selecting} className={`${pill(selecting)} ml-auto shrink-0`}>
            {selecting ? "Done" : "Select"}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{pending ? "Working" : `${total} leads found`}</p>
      {bulkMsg && <p role="status" className={`flex animate-rise items-center gap-1.5 text-sm ${bulkMsg.error ? "text-score-1" : "text-accent-ink"}`}>{!bulkMsg.error && <Check aria-hidden className="size-4" />}{bulkMsg.text}</p>}

      {selecting && (
        <div role="toolbar" aria-label="Bulk actions" className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-2xl animate-rise flex-wrap items-center gap-2 rounded-card bg-surface-light p-2 pl-4 text-on-light shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)] md:bottom-6">
          <span className="mr-auto text-sm font-medium">{picked.size ? `${picked.size} selected` : "Tap leads to select"}</span>
          <button type="button" onClick={() => { setArmed(false); setPicked(new Set(leads.map((l) => l.id))); }} className="min-h-11 rounded-full px-3 text-sm hover:bg-black/5">All {leads.length}</button>
          <label className="relative">
            <span className="sr-only">Move selected leads to stage</span>
            <select
              value=""
              disabled={!picked.size || pending}
              onChange={(e) => { const st = e.target.value as Stage; runBulk(async () => { const { moved } = await bulkSetStage([...picked], st); return `Moved ${moved} lead${moved === 1 ? "" : "s"} to ${st}.`; }); }}
              className="min-h-11 rounded-full bg-on-light px-4 text-sm text-surface-light outline-none disabled:opacity-40"
            >
              <option value="" disabled>Move to…</option>
              {STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </label>
          {team && (
            <label className="relative">
              <span className="sr-only">Assign selected leads</span>
              <select
                value=""
                disabled={!picked.size || pending}
                onChange={(e) => {
                  const v = e.target.value === "none" ? null : e.target.value;
                  runBulk(async () => { const { assigned } = await bulkSetOwner([...picked], v); return `${v ? `Assigned ${assigned} to ${nameOf(v)}` : `Unassigned ${assigned}`} lead${assigned === 1 ? "" : "s"}.`; });
                }}
                className="min-h-11 rounded-full bg-on-light px-4 text-sm text-surface-light outline-none disabled:opacity-40"
              >
                <option value="" disabled>Assign to…</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.email.split("@")[0]}</option>)}
                <option value="none">Unassigned</option>
              </select>
            </label>
          )}
          <button
            type="button"
            disabled={!picked.size || pending}
            onClick={() => armed
              ? runBulk(async () => { const { deleted } = await bulkDelete([...picked]); return `Deleted ${deleted} lead${deleted === 1 ? "" : "s"}.`; })
              : setArmed(true)}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm transition disabled:opacity-40 ${armed ? "bg-[#b42318] font-medium text-white" : "text-[#b42318] hover:bg-black/5"}`}
          >
            <Trash2 aria-hidden className="size-4" /> {armed ? `Delete ${picked.size}?` : "Delete"}
          </button>
          <button type="button" onClick={stopSelecting} aria-label="Cancel selection" className="grid size-11 place-items-center rounded-full hover:bg-black/5"><X aria-hidden className="size-4" /></button>
        </div>
      )}
      {leads.length ? (
        <>
          <div data-tour="leads" className={`flex flex-col gap-6 transition-opacity duration-150 ${pending ? "opacity-60" : ""}`}>
            {filters.slice(1).map((band) => {
              const rows = leads.filter((l) => scoreLabel(l.score) === band);
              if (!rows.length) return null;
              return (
                <section key={band} aria-labelledby={`band-${band}`} className="flex flex-col gap-2">
                  <h2 id={`band-${band}`} className="flex items-center gap-2 px-1 text-sm text-muted">
                    {band === "Hot" && <Flame aria-hidden className="size-4 text-score-2" />}
                    <span className={band === "Hot" ? "text-ink" : ""}>{band}</span>
                    <span className="tabular-nums">{temp === "All" ? counts[band] : rows.length}</span>
                  </h2>
                  <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
                    {rows.map((l) => <LeadRow key={l.id} lead={l} now={now} owner={team ? nameOf(l.ownerId) : undefined} selected={picked.has(l.id)} onToggle={selecting ? () => toggle(l.id) : undefined} />)}
                  </ul>
                </section>
              );
            })}
          </div>
          {leads.length < total && (
            <button type="button" onClick={() => go({ limit: limit + PAGE })} disabled={pending} className={`${pill(false)} self-center`}>
              {pending ? "Loading…" : `Show more · ${total - leads.length} left`}
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-6 text-sm">
          <p>No leads match{q && <> “{q}”</>}{temp !== "All" && <> in {temp}</>}{tag && <> tagged #{tag}</>}{owner === "me" && <> owned by you</>}{owner === "none" && <> without an owner</>}.</p>
          <button type="button" onClick={() => { setText(""); go({ q: "", temp: "All", owner: "", tag: "" }); }} className={pill(false)}>Clear search and filters</button>
        </div>
      )}
    </section>
  );
}
