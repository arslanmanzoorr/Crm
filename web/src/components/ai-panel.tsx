"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/ai";

/** Button that runs one AI task and shows the result (or the error) under it. */
export function AiPanel({ task, data, label }: { task: "analyze"; data: unknown; label: string }) {
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      setOut(await askAi(task, data));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-light hover:bg-accent-strong disabled:opacity-60"
      >
        <Sparkles className="size-4" /> {busy ? "Thinking…" : label}
      </button>
      {out && <p className="whitespace-pre-line rounded-2xl bg-white p-4 text-sm text-on-light/80">{out}</p>}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </div>
  );
}
