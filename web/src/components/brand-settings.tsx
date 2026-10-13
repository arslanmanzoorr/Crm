"use client";

import { useState, useTransition } from "react";
import { setBranding } from "@/lib/actions";
import { brandColorError } from "@/lib/brand";
import { primaryBtn } from "./forms";

const DEFAULT = "#c5f36a";

/** Accent color and "Powered by EstateOS" on lead forms, open house sign-in and the client portal. */
export function BrandSettings({ color, hide }: { color: string | null; hide: boolean }) {
  const [c, setC] = useState(color ?? DEFAULT);
  const [h, setH] = useState(hide);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const warn = brandColorError(c);
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-4 text-sm">
      <label className="flex flex-wrap items-center gap-3">
        <input type="color" value={c} onChange={(e) => setC(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg bg-transparent" aria-describedby="brand-preview" />
        <span>Accent color</span>
        <span id="brand-preview" className="rounded-full px-4 py-2 font-medium text-on-light" style={{ background: c }}>Send</span>
        {c !== DEFAULT && <button type="button" onClick={() => setC(DEFAULT)} className="text-muted underline hover:text-ink">Reset</button>}
      </label>
      {warn && <p className="text-score-1">{warn}</p>}
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={h} onChange={(e) => setH(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
        Hide &ldquo;Powered by EstateOS&rdquo;
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending || !!warn} className={`${primaryBtn} w-fit`}
          onClick={() => start(async () => setMsg((await setBranding(c === DEFAULT ? null : c, h)) ?? null))}>{pending ? "Saving…" : "Save branding"}</button>
        {msg?.error && <span role="alert" className="text-score-1">{msg.error}</span>}
        {msg?.ok && <span role="status" className="text-muted">{msg.ok}</span>}
      </div>
    </div>
  );
}
