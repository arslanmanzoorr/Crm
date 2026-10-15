"use client";

import { Monitor, Moon, Sun, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { setMyTheme } from "@/lib/actions";
import type { Theme } from "@/lib/features";

const OPTIONS = [
  { v: null, label: "Team default", icon: Users },
  { v: "dark", label: "Dark", icon: Moon },
  { v: "light", label: "Light", icon: Sun },
  { v: "system", label: "Match device", icon: Monitor },
] as const;

/** Each person's appearance; saves as soon as it changes. */
export function ThemePicker({ mine, team }: { mine: Theme | null; team: Theme }) {
  const [v, setV] = useState<Theme | null>(mine);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const pick = (t: Theme | null) => { setV(t); start(async () => setMsg((await setMyTheme(t)) ?? null)); };
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-4 text-sm">
      <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map(({ v: o, label, icon: Icon }) => (
          <button key={label} type="button" role="radio" aria-checked={v === o} disabled={pending} onClick={() => pick(o)}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-center ${v === o ? "border-ink bg-surface-3" : "border-line/10 hover:border-line/30"}`}>
            <Icon aria-hidden className="size-5" />
            {label}
          </button>
        ))}
      </div>
      <p className="text-muted" aria-live="polite">
        {msg?.error ? <span className="text-score-1">{msg.error}</span> : v === null ? `Following your team: ${team === "system" ? "match device" : team}.` : "Only you see this."}
      </p>
    </div>
  );
}
