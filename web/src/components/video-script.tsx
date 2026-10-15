"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/ai";
import { input } from "./forms";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** AI reel script from the listing's facts: hook, scenes (on-screen text + voiceover), call to action. Editable. */
export function VideoScript({ facts }: { facts: Record<string, unknown> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const go = async () => { setBusy(true); setErr(null); try { setText((await askAi("script", facts)).replace(/\*\*/g, "")); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <section aria-labelledby="script" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="script" className="text-xl">Video script</h2>
        <button type="button" onClick={go} disabled={busy} className={pill}><Sparkles aria-hidden className="size-4" />{busy ? "Writing…" : text ? "Rewrite" : "Write a script"}</button>
      </div>
      {text ? (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} aria-label="Video script" className={`${input} resize-y`} />
          <button type="button" className={`${pill} w-fit`} onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
            {copied ? <Check aria-hidden className="size-4 text-accent-ink" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy"}
          </button>
        </>
      ) : !busy && <p className="text-sm text-muted">A 30–45 second reel: hook, scenes with on-screen text and voiceover, and your call to action. Built from the listing&apos;s facts only.</p>}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </section>
  );
}
