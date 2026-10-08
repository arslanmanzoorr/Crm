import { Mail, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiPanel } from "@/components/ai-panel";
import { Avatar, Chip, ScoreDots, scoreLabel } from "@/components/ui";
import { leads, leadById } from "@/lib/data";

const contactBtn = "flex items-center gap-2 rounded-full bg-surface-light px-4 py-2 text-sm font-medium text-on-light hover:bg-white";

export const generateStaticParams = () => leads.map(({ id }) => ({ id }));

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const lead = leadById((await params).id);
  if (!lead) notFound();

  return (
    <div className="flex flex-col gap-8">
      <Link href="/leads" className="text-sm text-muted hover:text-accent">← All leads</Link>

      <header className="flex flex-wrap items-center gap-5">
        <Avatar name={lead.name} size={80} />
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl font-light">{lead.name}</h1>
          <p className="text-muted">{lead.headline}</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <ScoreDots score={lead.score} /> {scoreLabel(lead.score)} · {lead.score}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${lead.phone}`} className={contactBtn}><Phone className="size-4" /> Call</a>
          <a href={`sms:${lead.phone}`} className={contactBtn}><MessageSquare className="size-4" /> Text</a>
          <a href={`mailto:${lead.email}`} className={contactBtn}><Mail className="size-4" /> Email</a>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="timeline" className="rounded-card bg-surface-2 p-6">
          <h2 id="timeline" className="mb-4 text-xl">Timeline</h2>
          <ol className="flex flex-col gap-4">
            {lead.activity.map((a) => (
              <li key={a.when + a.text} className="flex gap-4">
                <span className="w-24 shrink-0 text-xs text-muted">{a.when}</span>
                <span className="flex flex-col items-start gap-1">
                  <Chip>{a.channel}</Chip>
                  <span className="text-sm">{a.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="flex flex-col gap-4 rounded-card bg-surface-light p-6 text-on-light">
          <h2 className="text-2xl">AI profile</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-on-light/50">Intent</dt><dd>{lead.intent}</dd>
            <dt className="text-on-light/50">Budget</dt><dd>{lead.budget}</dd>
            <dt className="text-on-light/50">Areas</dt><dd>{lead.areas.join(", ")}</dd>
            <dt className="text-on-light/50">Wants</dt><dd>{lead.preferences.join(", ")}</dd>
            <dt className="text-on-light/50">Source</dt><dd>{lead.sources.join(", ")}</dd>
          </dl>
          <AiPanel task="analyze" data={lead} label="Analyze with AI" />
        </aside>
      </div>
    </div>
  );
}
