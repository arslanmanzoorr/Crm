import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DeleteWorkflow, InstallPlaybook, RetryRun, WorkflowBuilder, WorkflowToggle } from "@/components/automation-controls";
import { LocalTime } from "@/components/local-time";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getWorkflows } from "@/lib/db";
import { TEMPLATES, TRIGGERS, whenLabel, type Step } from "@/lib/playbooks";

export const metadata: Metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-light">Automations</h1>
        <p className="mt-1 max-w-2xl text-muted">Playbooks create the right follow-up task at the right time, so nothing depends on memory. They never message clients on their own: a person does that.</p>
      </header>
      {dbEnabled ? (
        <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>}><Playbooks /></Suspense>
      ) : <p className="text-muted">Connect Supabase to use automations.</p>}
    </div>
  );
}

const describe = (s: Step) => (s.kind === "tag" ? `Tag “${s.tag}”` : s.title);
const COND_WORDS: Record<string, string> = { buyer: "buyers", seller: "sellers", investor: "investors", renter: "renters", interested: "interested", maybe: "on the fence", offer: "wanting to offer", not_interested: "not interested", true: "with an agent", false: "without an agent" };

async function Playbooks() {
  const { workflows, failed, isAdmin } = await getWorkflows();
  const installed = new Set(workflows.map((w) => w.template).filter(Boolean));
  const available = TEMPLATES.filter((t) => !installed.has(t.key));

  return (
    <>
      <section aria-labelledby="on" className="flex flex-col gap-3">
        <h2 id="on" className="text-xl">Your playbooks</h2>
        {workflows.length === 0 && <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">None yet. Turn on a ready-made one below, or build your own.</p>}
        <ul className="flex flex-col gap-3">
          {workflows.map((w) => {
            const cond = Object.entries(w.conditions)[0];
            return (
              <li key={w.id} className={`flex flex-col gap-3 rounded-card bg-surface-2 p-5 ${w.enabled ? "" : "opacity-70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium">{w.name}</h3>
                    <p className="text-sm text-muted">{TRIGGERS[w.trigger]}{cond && ` · ${COND_WORDS[cond[1]] ?? cond[1]}`}{w.stopStages.length > 0 && ` · stops at ${w.stopStages.join(", ")}`}</p>
                  </div>
                  {isAdmin && <WorkflowToggle id={w.id} enabled={w.enabled} name={w.name} />}
                </div>
                <ol className="flex flex-col gap-1 text-sm">
                  {w.steps.map((s, i) => <li key={i}><span className="text-muted">{whenLabel(s.after_hours)}:</span> {describe(s)}</li>)}
                </ol>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted">{w.counts.pending} waiting · {w.counts.done} done · {w.counts.skipped} stopped{w.counts.failed > 0 && <span className="text-score-1"> · {w.counts.failed} failed</span>}</p>
                  {isAdmin && <DeleteWorkflow id={w.id} name={w.name} />}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {failed.length > 0 && (
        <section aria-labelledby="failed" className="flex flex-col gap-3">
          <h2 id="failed" className="text-xl text-score-1">Steps that failed</h2>
          <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
            {failed.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <CircleAlert aria-hidden className="size-4 shrink-0 text-score-1" />
                <span className="min-w-0 flex-1 basis-56"><span className="font-medium">{f.workflow}</span> for <Link href={`/leads/${f.contactId}`} className="hover:text-accent">{f.contact}</Link><span className="block text-muted">{f.error} · <LocalTime ts={f.at} /></span></span>
                {isAdmin && <RetryRun id={f.id} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {available.length > 0 && (
        <section aria-labelledby="ready" className="flex flex-col gap-3">
          <h2 id="ready" className="text-xl">Ready-made playbooks</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {available.map((t) => (
              <li key={t.key} className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
                <div>
                  <h3 className="font-medium">{t.name}</h3>
                  <p className="text-sm text-muted">{t.why}</p>
                </div>
                <ol className="flex flex-col gap-1 text-sm">
                  {t.steps.map((s, i) => <li key={i}><span className="text-muted">{whenLabel(s.after_hours)}:</span> {describe(s)}</li>)}
                </ol>
                {isAdmin ? <InstallPlaybook templateKey={t.key} /> : <p className="text-xs text-muted">An owner or admin can turn this on.</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && (
        <section aria-labelledby="build" className="flex max-w-3xl flex-col gap-3 rounded-card bg-surface-2 p-5">
          <h2 id="build" className="text-xl">Build your own</h2>
          <WorkflowBuilder />
        </section>
      )}
    </>
  );
}
