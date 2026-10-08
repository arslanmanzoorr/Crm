import { Mail, MessageSquare, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityForm } from "@/components/activity-form";
import { AnalyzeButton, DeleteButton, StageSelect } from "@/components/lead-controls";
import { LocalTime } from "@/components/local-time";
import { PropertyCard } from "@/components/property-card";
import { TaskList } from "@/components/tasks";
import { TaskForm } from "@/components/task-form";
import { Avatar, Chip, ScoreDots, scoreLabel } from "@/components/ui";
import { getLead, getProperties, getTasks } from "@/lib/db";

const contactBtn = "flex items-center gap-2 rounded-full bg-surface-light px-4 py-2 text-sm font-medium text-on-light hover:bg-white";
const blockedBtn = "flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm text-muted line-through";

export default function LeadPage({ params }: PageProps<"/leads/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading lead…</p>}>
      <Lead params={params} />
    </Suspense>
  );
}

async function Lead({ params }: { params: PageProps<"/leads/[id]">["params"] }) {
  const lead = await getLead((await params).id);
  if (!lead) notFound();
  const [tasks, properties] = await Promise.all([getTasks(), getProperties()]);
  const mine = tasks.filter((t) => t.contactId === lead.id);
  // ponytail: area match only; swap for pgvector matching once budgets are numeric.
  const matches = properties.filter((p) => p.status !== "Sold" && lead.areas.includes(p.area)).slice(0, 3);
  const c = lead.consent ?? { sms: true, call: true, email: true, dnc: false };
  const ok = (v: boolean) => v && !c.dnc;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/leads" className="text-sm text-muted hover:text-accent">← All leads</Link>

      <header className="flex flex-wrap items-center gap-5">
        <Avatar name={lead.name} size={80} />
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl font-light">{lead.name}</h1>
          <p className="text-muted">{lead.headline}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <ScoreDots score={lead.score} /> {scoreLabel(lead.score)} · {lead.score}
            {lead.stage && <StageSelect id={lead.id} stage={lead.stage} />}
            {c.dnc && <Chip>Do not contact</Chip>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ok(c.call) && lead.phone ? <a href={`tel:${lead.phone}`} className={contactBtn}><Phone className="size-4" /> Call</a> : <span title="No call consent or number" className={blockedBtn}><Phone className="size-4" /> Call</span>}
          {ok(c.sms) && lead.phone ? <a href={`sms:${lead.phone}`} className={contactBtn}><MessageSquare className="size-4" /> Text</a> : <span title="No SMS consent or number" className={blockedBtn}><MessageSquare className="size-4" /> Text</span>}
          {ok(c.email) && lead.email ? <a href={`mailto:${lead.email}`} className={contactBtn}><Mail className="size-4" /> Email</a> : <span title="No email consent or address" className={blockedBtn}><Mail className="size-4" /> Email</span>}
          <Link href={`/leads/${lead.id}/edit`} className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm hover:bg-surface-3"><Pencil className="size-4" /> Edit</Link>
          <DeleteButton id={lead.id} what="lead" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="tasks" className="rounded-card bg-surface-2 p-6">
            <h2 id="tasks" className="mb-4 text-xl">Tasks</h2>
            <TaskForm contactId={lead.id} />
            <div className="mt-4"><TaskList tasks={mine} /></div>
          </section>

          <section aria-labelledby="timeline" className="rounded-card bg-surface-2 p-6">
            <h2 id="timeline" className="mb-4 text-xl">Timeline</h2>
            <ActivityForm contactId={lead.id} />
            <ol className="flex flex-col gap-4">
              {lead.activity.map((a, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-28 shrink-0 text-xs text-muted"><LocalTime ts={a.when} /></span>
                  <span className="flex flex-col items-start gap-1">
                    <Chip>{a.inbound ? `${a.channel} · in` : a.channel}</Chip>
                    <span className="text-sm">{a.text}</span>
                  </span>
                </li>
              ))}
              {lead.activity.length === 0 && <li className="text-sm text-muted">Nothing logged yet.</li>}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-card bg-surface-light p-6 text-on-light">
            <h2 className="text-2xl">AI profile</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-on-light/50">Intent</dt><dd>{lead.intent}</dd>
              {lead.nextAction && <><dt className="text-on-light/50">Next</dt><dd className="font-medium">{lead.nextAction}</dd></>}
              <dt className="text-on-light/50">Budget</dt><dd>{lead.budget || "—"}</dd>
              <dt className="text-on-light/50">Areas</dt><dd>{lead.areas.join(", ") || "—"}</dd>
              <dt className="text-on-light/50">Wants</dt><dd>{lead.preferences.join(", ") || "—"}</dd>
              <dt className="text-on-light/50">Source</dt><dd>{lead.sources.join(", ") || "—"}</dd>
            </dl>
            <AnalyzeButton id={lead.id} />
          </section>
          {matches.length > 0 && (
            <section aria-labelledby="matches" className="flex flex-col gap-3">
              <h2 id="matches" className="text-xl">Listings in their areas</h2>
              {matches.map((p) => <PropertyCard key={p.id} p={p} />)}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
