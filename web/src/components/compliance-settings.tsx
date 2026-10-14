"use client";

import { useState, useTransition } from "react";
import { setCompliance } from "@/lib/actions";
import { inputAuto, primaryBtn } from "./forms";

const label = (h: number) => (h === 12 ? "12 noon" : h < 12 ? `${h}am` : `${h - 12}pm`);

/** Calling hours (inside the federal 8am–9pm only) and the all-party recording reminder. */
export function ComplianceSettings({ start, end, allParty }: { start: number; end: number; allParty: boolean }) {
  const [s, setS] = useState(start);
  const [e, setE] = useState(end);
  const [a, setA] = useState(allParty);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, run] = useTransition();
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-2 p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span>Calls and texts between</span>
        <select aria-label="Earliest hour" value={s} onChange={(x) => setS(Number(x.target.value))} className={inputAuto}>
          {Array.from({ length: 13 }, (_, i) => i + 8).map((h) => <option key={h} value={h}>{label(h)}</option>)}
        </select>
        <span>and</span>
        <select aria-label="Latest hour" value={e} onChange={(x) => setE(Number(x.target.value))} className={inputAuto}>
          {Array.from({ length: 13 }, (_, i) => i + 9).map((h) => <option key={h} value={h}>{label(h)}</option>)}
        </select>
      </div>
      <p className="-mt-2 text-xs text-muted">Federal rules allow 8am–9pm in the recipient&apos;s local time; narrow it if your state is stricter. Outside these hours the Call and Text buttons on a lead are paused. Times use your office or team time zone.</p>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={a} onChange={(x) => setA(x.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
        <span>Remind agents to get everyone&apos;s consent before recording a call<span className="block text-xs text-muted">Turn on if you work in a state that requires all-party consent to record.</span></span>
      </label>
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending || e <= s} className={`${primaryBtn} w-fit`} onClick={() => run(async () => setMsg((await setCompliance(s, e, a)) ?? null))}>{pending ? "Saving…" : "Save"}</button>
        {e <= s && <span className="text-score-1">The end must be after the start.</span>}
        {msg?.error && <span role="alert" className="text-score-1">{msg.error}</span>}
        {msg?.ok && <span role="status" className="text-muted">{msg.ok}</span>}
      </div>
    </div>
  );
}
