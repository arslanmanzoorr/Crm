"use client";

import { BellRing, Phone } from "lucide-react";
import Link from "next/link";
import type { WaitingLead } from "@/lib/db";
import { fmtWait, waitLevel, type Wait } from "@/lib/response";
import { useNow } from "./header";
import { AlertsToggle } from "./watchdog";

const TONE: Record<Wait, string> = {
  new: "text-muted",
  late: "text-score-2",
  later: "text-score-2 font-medium",
  overdue: "text-score-1 font-medium",
};

/** Inbound leads nobody has answered yet, oldest first, with a live wait timer. Quiet when everyone got a reply. */
export function LeadsWaiting({ leads, team }: { leads: WaitingLead[]; team: boolean }) {
  const now = useNow();
  if (leads.length === 0) return null;
  return (
    <section aria-labelledby="waiting" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="waiting" className="flex items-center gap-2 text-xl">
          <BellRing aria-hidden className="size-5 text-score-1" />
          Waiting for a first reply <span className="text-muted">({leads.length})</span>
        </h2>
        <AlertsToggle />
      </div>
      <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
        {leads.map((l) => {
          const min = now ? (now.getTime() - Date.parse(l.createdAt)) / 60_000 : 0;
          return (
            <li key={l.id} className="flex min-h-16 items-center gap-4 px-4 py-3 sm:px-5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{l.name}</span>
                <span className="block text-sm text-muted">
                  <span className={`tabular-nums ${now ? TONE[waitLevel(min)] : ""}`}>{now ? `Waiting ${fmtWait(min)}` : "Waiting"}</span>
                  {" · "}{l.source ?? "New lead"}{team && <> · {l.owner ? (l.mine ? "You" : l.owner) : "Unassigned"}</>}
                </span>
              </span>
              <Link href={`/leads/${l.id}`} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-surface-light px-4 text-sm font-medium text-on-light hover:bg-white">
                <Phone aria-hidden className="size-4" /> Reply
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
