import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyDemo } from "@/components/empty-demo";
import { LeadViews } from "@/components/lead-views";
import { LeadList, type Filter } from "@/components/leads";
import { Reveal, LoadingCards } from "@/components/ui";
import { PAGE, getMembers, listLeads, type LeadFilters, type Temp } from "@/lib/db";
import { AskLeads } from "@/components/ask-leads";
import Link from "next/link";
import { normTag } from "@/lib/search";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage({ searchParams }: PageProps<"/leads">) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-light">Leads</h1>
        <LeadViews current="list" />
      </header>
      <Suspense fallback={<LoadingCards label="Loading leads" count={6} />}>
        <Leads searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

async function Leads({ searchParams }: { searchParams: PageProps<"/leads">["searchParams"] }) {
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const temp = (["Hot", "Warm", "Cold"].includes(one(sp.temp)) ? one(sp.temp) : "All") as Filter;
  const limit = Math.min(500, Math.max(PAGE, Number(one(sp.show)) || PAGE));
  const ownerParam = one(sp.owner);
  const ownerFilter = ownerParam === "me" || ownerParam === "none" ? ownerParam : "";
  const tag = normTag(one(sp.tag));
  const team = await getMembers();
  const f: LeadFilters = {
    type: one(sp.type) || undefined, stage: one(sp.stage) || undefined, area: one(sp.area).slice(0, 80) || undefined,
    quietDays: Number(one(sp.quiet)) > 0 ? Math.min(Number(one(sp.quiet)), 3650) : undefined, moveSoon: one(sp.soon) === "1",
  };
  const asked = one(sp.asked).slice(0, 200);
  const narrowed = [f.type && `${f.type}s`, f.stage, f.area && `in ${f.area}`, f.quietDays && `quiet ${f.quietDays}+ days`, f.moveSoon && "moving soon"].filter(Boolean) as string[];
  const summary = [...narrowed, temp !== "All" && temp, q && `"${q}"`, tag && `#${tag}`].filter(Boolean) as string[];
  const { leads, total, counts } = await listLeads({
    q, temp: temp === "All" ? undefined : (temp as Temp), limit, tag: tag || undefined,
    owner: ownerFilter === "me" ? team.me || undefined : ownerFilter || undefined, f,
  });
  if (counts.All === 0 && !q && !tag && !ownerFilter && narrowed.length === 0) return <EmptyDemo what="leads" />;
  return (
    <Reveal>
      <div className="mb-4 flex flex-col gap-2">
        <AskLeads initial={asked} />
        {(narrowed.length > 0 || asked) && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{summary.length ? `Showing ${summary.join(" · ")}` : "No filters matched that question."}</span>
            <Link href="/leads" className="text-accent-ink underline">Clear</Link>
          </p>
        )}
      </div>
      <LeadList leads={leads} total={total} counts={counts} q={q} temp={temp} limit={limit} owner={ownerFilter} tag={tag} members={team.members} />
    </Reveal>
  );
}
