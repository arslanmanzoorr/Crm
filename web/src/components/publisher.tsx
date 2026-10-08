"use client";

import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/ai";
import type { Property } from "@/lib/data";

const PLATFORMS = ["Instagram", "TikTok", "YouTube Shorts", "Facebook", "LinkedIn", "Google Business"];
const plural = (n: number) => `${n} platform${n === 1 ? "" : "s"}`;
const field = "rounded-full bg-surface-2 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function Publisher({ properties, initialPropertyId }: { properties: Property[]; initialPropertyId: string }) {
  const propertyById = (id: string) => properties.find((p) => p.id === id);
  const [propertyId, setPropertyId] = useState(propertyById(initialPropertyId) ? initialPropertyId : properties[0]?.id);
  const [selected, setSelected] = useState<string[]>(["Instagram", "TikTok", "Facebook"]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);

  const property = propertyById(propertyId);
  if (!property) return <p className="text-muted">Add a listing first (Listings → Add listing), then come back to post it.</p>;
  const toggle = (p: string) => setSelected(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);

  async function generate() {
    setBusy(true);
    setStatus(null);
    try {
      const out = await Promise.all(selected.map((platform) => askAi("caption", { platform, property })));
      setCaptions(Object.fromEntries(selected.map((p, i) => [p, out[i]])));
    } catch (e) {
      setStatus({ error: true, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    const missing = selected.filter((p) => !captions[p]?.trim());
    if (missing.length) return setStatus({ error: true, text: `Add a caption for ${missing.join(", ")} first.` });
    setBusy(true);
    setStatus(null);
    const posts = selected.map((platform) => ({ platform, caption: captions[platform].trim() }));
    try {
      const res = await fetch("/api/publish", { method: "POST", body: JSON.stringify({ property, posts, scheduledAt: when ? new Date(when).toISOString() : null }) });
      const json = await res.json().catch(() => ({ error: `Publishing failed (${res.status}).` }));
      setStatus(res.ok
        ? { error: false, text: when ? `Scheduled for ${new Date(when).toLocaleString()}.` : `Sent to ${plural(selected.length)} for publishing.` }
        : { error: true, text: json.error });
    } catch {
      setStatus({ error: true, text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-light">Publish</h1>

      <div className="flex flex-wrap items-center gap-3">
        <select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setCaptions({}); }} aria-label="Property" className={field}>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
        <div role="group" aria-label="Platforms" className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={selected.includes(p)}
              onClick={() => toggle(p)}
              className={`rounded-full px-4 py-2 text-sm ${selected.includes(p) ? "bg-accent text-on-light" : "bg-surface-2 hover:text-accent"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={generate} disabled={busy || !selected.length} className="flex w-fit items-center gap-2 rounded-full bg-surface-light px-5 py-2.5 font-medium text-on-light hover:bg-white disabled:opacity-50">
        <Sparkles className="size-4" /> {busy ? "Working…" : "Write captions with AI"}
      </button>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {selected.map((p) => (
          <label key={p} className="flex flex-col gap-2 rounded-card bg-surface-2 p-4">
            <span className="text-sm font-medium">{p}</span>
            <textarea
              value={captions[p] ?? ""}
              onChange={(e) => setCaptions({ ...captions, [p]: e.target.value })}
              rows={7}
              placeholder="Caption…"
              className="resize-none rounded-2xl bg-surface-1 p-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Schedule for (leave empty to post now)" className={field} />
        <button type="button" onClick={publish} disabled={busy || !selected.length} className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-on-light hover:bg-accent-strong disabled:opacity-50">
          <Send aria-hidden className="size-4" /> {when ? "Schedule" : "Publish now"} to {plural(selected.length)}
        </button>
        <p role="status" className={`text-sm ${status?.error ? "text-score-1" : "text-accent"}`}>{status?.text}</p>
      </div>
    </div>
  );
}
