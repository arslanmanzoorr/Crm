import { CircleAlert, CircleCheck } from "lucide-react";
import type { Readiness } from "@/lib/readiness";

const LABEL = { ready: "Ready", gaps: "Some gaps", blocked: "Needs attention" } as const;

/** Readiness verdict plus the specific reasons, most urgent first. */
export function ReadinessList({ r }: { r: Readiness }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className={`flex items-center gap-1.5 text-sm font-medium ${r.level === "blocked" ? "text-score-1" : r.level === "ready" ? "text-accent" : ""}`}>
        {r.level === "ready" ? <CircleCheck aria-hidden className="size-4" /> : <CircleAlert aria-hidden className="size-4" />}
        Financing: {LABEL[r.level]}
      </p>
      {r.items.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {r.items.map((i) => <li key={i.text} className={i.level === "high" ? "text-score-1" : "text-ink/80"}>{i.text}</li>)}
        </ul>
      )}
    </div>
  );
}
