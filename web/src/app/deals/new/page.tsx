import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DealForm } from "@/components/deal-form";
import { Skeleton } from "@/components/ui";
import { getLead, getLeadOptions, getProperties } from "@/lib/db";

export const metadata: Metadata = { title: "New deal" };

export default function NewDealPage({ searchParams }: PageProps<"/deals/new">) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/deals" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All deals</Link>
      <h1 className="text-4xl font-light">New deal</h1>
      <Suspense fallback={<Skeleton className="h-[640px]" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/deals/new">["searchParams"] }) {
  const [clients, listings, sp] = await Promise.all([getLeadOptions(), getProperties(), searchParams]);
  const contact = typeof sp.contact === "string" ? sp.contact : undefined;
  if (contact && !clients.some((c) => c.id === contact)) {
    const lead = await getLead(contact); // older leads fall outside the recent-200 picker
    if (lead) clients.unshift({ id: lead.id, name: lead.name });
  }
  return <DealForm clients={clients} listings={listings.filter((p) => p.status !== "Sold").map(({ id, address }) => ({ id, address }))} contactId={contact} />;
}
