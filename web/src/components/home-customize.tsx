"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, SlidersHorizontal } from "lucide-react";
import { Reorder, useDragControls, useReducedMotion } from "motion/react";
import { useState, useTransition } from "react";
import { setHomeLayout } from "@/lib/actions";
import { SECTIONS, type Section } from "@/lib/features";
import { primaryBtn } from "./forms";

const label = (k: Section) => SECTIONS.find((s) => s.key === k)?.label ?? k;
const iconBtn = "grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink disabled:opacity-30";

/** Drag sections into your own order (or use the arrows), hide the ones you don't need. Saved per person. */
export function HomeCustomize({ order, hidden }: { order: Section[]; hidden: Section[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(order);
  const [off, setOff] = useState(new Set(hidden));
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const move = (i: number, d: number) => setItems((l) => { const n = [...l]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const flip = (k: Section) => setOff((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 w-fit items-center gap-2 self-center rounded-full px-4 text-sm text-muted hover:bg-surface-2 hover:text-ink">
      <SlidersHorizontal aria-hidden className="size-4" /> Customize this page
    </button>
  );
  return (
    <section aria-labelledby="customize" className="flex flex-col gap-4 rounded-card bg-surface-2 p-5">
      <div>
        <h2 id="customize" className="text-xl">Customize this page</h2>
        <p className="mt-1 text-sm text-muted">Drag to reorder, or use the arrows. Only you see this layout.</p>
      </div>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-2">
        {items.map((k, i) => <Row key={k} k={k} i={i} last={i === items.length - 1} hidden={off.has(k)} move={move} flip={flip} />)}
      </Reorder.Group>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} className={primaryBtn}
          onClick={() => start(async () => { const r = await setHomeLayout(items, [...off]); setMsg(r ?? null); if (r?.ok) setOpen(false); })}>{pending ? "Saving…" : "Save layout"}</button>
        <button type="button" onClick={() => { setItems(SECTIONS.map((s) => s.key).filter((k) => order.includes(k))); setOff(new Set()); }} className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-ink">Reset</button>
        <button type="button" onClick={() => { setItems(order); setOff(new Set(hidden)); setOpen(false); }} className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-ink">Cancel</button>
        {msg?.error && <span role="alert" className="text-sm text-score-1">{msg.error}</span>}
      </div>
    </section>
  );
}

function Row({ k, i, last, hidden, move, flip }: { k: Section; i: number; last: boolean; hidden: boolean; move: (i: number, d: number) => void; flip: (k: Section) => void }) {
  const drag = useDragControls();
  const reduce = useReducedMotion();
  return (
    <Reorder.Item value={k} dragListener={false} dragControls={drag} layout={reduce ? undefined : "position"}
      className={`flex min-h-14 items-center gap-1 rounded-2xl bg-surface-3/70 pr-1 pl-1 ${hidden ? "text-muted" : ""}`}
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 32px rgb(0 0 0 / 0.45)" }}>
      <span aria-hidden onPointerDown={(e) => drag.start(e)} className="grid size-10 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing">
        <GripVertical className="size-5" />
      </span>
      <span className={`min-w-0 flex-1 truncate ${hidden ? "line-through decoration-white/30" : ""}`}>{label(k)}</span>
      <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${label(k)} up`}><ArrowUp aria-hidden className="size-4" /></button>
      <button type="button" className={iconBtn} disabled={last} onClick={() => move(i, 1)} aria-label={`Move ${label(k)} down`}><ArrowDown aria-hidden className="size-4" /></button>
      <button type="button" className={iconBtn} onClick={() => flip(k)} aria-pressed={!hidden} aria-label={`${hidden ? "Show" : "Hide"} ${label(k)}`}>
        {hidden ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </Reorder.Item>
  );
}
