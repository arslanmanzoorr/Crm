"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/ai";
import { FarmNote } from "./farm-note";

/** Prep for the lead's next call or email task: AI talking points or a draft email, from the lead's own data. */
export function TaskPrep({ task, lead, data, blocked }: { task: { title: string; kind: "call" | "email" }; lead: { id: string; name: string }; data: unknown; blocked?: string | null }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => { setBusy(true); setErr(null); try { setText((await askAi("prep", data)).replace(/\*\*/g, "")); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  if (blocked) return <p className="mt-3 border-t border-line/5 pt-3 text-sm text-muted">Next task: {task.title}. No prep drafted: {blocked}.</p>;
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-line/5 pt-3">
      <button type="button" onClick={go} disabled={busy} className="flex min-h-10 w-fit items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60">
        <Sparkles aria-hidden className="size-4" />{busy ? "Preparing…" : `${task.kind === "call" ? "Prep this call" : "Draft this email"}: ${task.title}`}
      </button>
      {text && (task.kind === "email"
        ? <FarmNote key={text} label="Email" draft={text} due={[{ id: lead.id, name: lead.name }]} />
        : <p className="whitespace-pre-line rounded-2xl bg-surface-1 p-3 text-sm leading-relaxed">{text}</p>)}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </div>
  );
}
