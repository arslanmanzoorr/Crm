"use client";

import { CheckCircle2, Download, FileText, Mic, MicOff, PhoneOff, Sparkles, Target, Video, X } from "lucide-react";
import { useState } from "react";
import { callSummary } from "@/lib/data";
import { Avatar, IconButton } from "./ui";

/** Floating call window + light AI Summary drawer (transcription → summary, per the spec). */
export function CallPanel({ contact, onClose }: { contact: string; onClose: () => void }) {
  const [muted, setMuted] = useState(false);
  const s = { ...callSummary, contact };

  return (
    <aside
      aria-label={`Call with ${contact}`}
      className="fixed inset-x-3 bottom-3 z-20 flex max-h-[85vh] flex-col gap-3 overflow-y-auto lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-6 lg:w-[380px]"
    >
      {/* call window */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-surface-3 to-surface-1 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 rounded-full bg-bg/60 px-3 py-1 text-xs">
            <span className="size-2 animate-pulse rounded-full bg-score-1" /> Recording · {s.duration}
          </span>
          <IconButton label="Close call panel" onClick={onClose} className="size-9">
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="grid place-items-center py-8">
          <Avatar name={contact} size={96} />
          <p className="mt-3 text-lg">{contact}</p>
          <p className="text-xs text-muted">Live transcription on · AI disclosed</p>
        </div>
        <div className="flex justify-center gap-3">
          <IconButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)}>
            {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </IconButton>
          <IconButton label="Camera">
            <Video className="size-5" />
          </IconButton>
          <IconButton label="End call" variant="danger" onClick={onClose}>
            <PhoneOff className="size-5" />
          </IconButton>
        </div>
      </div>

      {/* AI summary */}
      <div className="rounded-card bg-surface-light p-5 text-on-light">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-on-light text-accent">
            <Sparkles className="size-4" />
          </span>
          <h2 className="text-2xl">Summary</h2>
        </div>

        <h3 className="mt-5 mb-2 text-sm font-medium">Documents</h3>
        <div className="flex gap-3">
          {s.documents.map((d) => (
            <button
              key={d}
              type="button"
              className="group flex w-28 flex-col items-center gap-2 rounded-2xl bg-white p-3 text-xs shadow-sm hover:ring-2 hover:ring-accent"
            >
              <FileText className="size-8 text-on-light/60" />
              {d}
              <Download className="size-3.5 opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>

        <h3 className="mt-5 mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Target className="size-4" /> Goal
        </h3>
        <p className="text-sm text-on-light/70">{s.goal}</p>

        <h3 className="mt-5 mb-2 text-sm font-medium">Key points</h3>
        <ul className="space-y-1.5 text-sm text-on-light/70">
          {s.keyPoints.map((k) => (
            <li key={k} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-on-light/40" />
              {k}
            </li>
          ))}
        </ul>

        <h3 className="mt-5 mb-2 text-sm font-medium">Next steps</h3>
        <ul className="space-y-2">
          {s.nextSteps.map((n) => (
            <li key={n} className="flex items-center justify-between gap-2 rounded-full bg-white py-1.5 pr-1.5 pl-4 text-sm">
              {n}
              <button
                type="button"
                className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium hover:bg-accent-strong"
              >
                <CheckCircle2 className="size-3.5" /> Approve
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
