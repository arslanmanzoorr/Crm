import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NewLeads } from "@/components/leads";
import { EmptyDemo } from "@/components/empty-demo";
import { getLeads } from "@/lib/db";

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/leads/new" className="flex w-fit items-center gap-2 self-end rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-light hover:bg-accent-strong">
        <Plus className="size-4" /> Add lead
      </Link>
      <Suspense fallback={<p className="text-sm text-muted">Loading leads…</p>}>
        <Leads />
      </Suspense>
    </div>
  );
}

async function Leads() {
  const leads = await getLeads();
  return leads.length ? <NewLeads leads={leads} wrap /> : <EmptyDemo what="leads" />;
}
