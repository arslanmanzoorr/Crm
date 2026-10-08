import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LeadForm } from "@/components/lead-form";
import { getLead } from "@/lib/db";

export default function EditLeadPage({ params }: PageProps<"/leads/[id]/edit">) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}

async function Edit({ params }: { params: PageProps<"/leads/[id]/edit">["params"] }) {
  const lead = await getLead((await params).id);
  if (!lead) notFound();
  return (
    <>
      <Link href={`/leads/${lead.id}`} className="text-sm text-muted hover:text-accent">← {lead.name}</Link>
      <h1 className="text-4xl font-light">Edit lead</h1>
      <LeadForm lead={lead} />
    </>
  );
}
