import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyDemo } from "@/components/empty-demo";
import { LeadList } from "@/components/leads";
import { Reveal } from "@/components/ui";
import { getLeads } from "@/lib/db";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-light">Leads</h1>
        <Link href="/leads/new" className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-on-light hover:bg-accent-strong">
          <Plus aria-hidden className="size-4" /> Add lead
        </Link>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading leads…</p>}>
        <Leads />
      </Suspense>
    </div>
  );
}

async function Leads() {
  const leads = await getLeads();
  return <Reveal>{leads.length ? <LeadList leads={leads} /> : <EmptyDemo what="leads" />}</Reveal>;
}
