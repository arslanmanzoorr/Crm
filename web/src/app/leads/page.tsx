import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyDemo } from "@/components/empty-demo";
import { LeadList, type Filter } from "@/components/leads";
import { Reveal } from "@/components/ui";
import { PAGE, listLeads, type Temp } from "@/lib/db";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage({ searchParams }: PageProps<"/leads">) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-light">Leads</h1>
        <Link href="/leads/new" className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-on-light hover:bg-accent-strong">
          <Plus aria-hidden className="size-4" /> Add lead
        </Link>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading leads…</p>}>
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
  const { leads, total, counts } = await listLeads({ q, temp: temp === "All" ? undefined : (temp as Temp), limit });
  if (counts.All === 0 && !q) return <EmptyDemo what="leads" />;
  return (
    <Reveal>
      <LeadList leads={leads} total={total} counts={counts} q={q} temp={temp} limit={limit} />
    </Reveal>
  );
}
