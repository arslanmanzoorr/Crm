import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "@/components/print-button";
import { money } from "@/lib/data";
import { getDeal, getDealEarnest, getMe, getMembers, getTeam, getTemplates, teamToday } from "@/lib/db";
import { fill } from "@/lib/templates";

export const metadata: Metadata = { title: "Document" };

const long = (d: string | null) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

export default function FilledDocPage({ params }: PageProps<"/deals/[id]/templates/[tid]/print">) {
  return <Suspense><Doc params={params} /></Suspense>;
}

async function Doc({ params }: { params: PageProps<"/deals/[id]/templates/[tid]/print">["params"] }) {
  const { id, tid } = await params;
  const [d, templates, me, members, team, earnest, today] = await Promise.all([getDeal(id), getTemplates(), getMe(), getMembers(), getTeam(), getDealEarnest(id), teamToday()]);
  const t = templates.find((x) => x.id === tid);
  if (!d || !t) notFound();
  const owner = members.members.find((m) => m.userId === d.ownerId);
  const { text, missing } = fill(t.body, {
    client_name: d.contact.name, property_address: d.property?.address || d.address, price: money(d.price), earnest: earnest ? money(earnest) : "",
    accepted_date: long(d.acceptedOn), closing_date: long(d.closeOn), side: d.side === "buyer" ? "Buyer" : "Seller",
    agent_name: owner?.userId === members.me ? me.name : owner?.email.split("@")[0] ?? "", agent_email: owner?.email ?? "", team_name: team?.org.name ?? "", today: long(today),
  });
  return (
    <div className="mx-auto flex max-w-[52rem] flex-col gap-4 print:max-w-none">
      <h1 className="sr-only">{t.name}</h1>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/deals/${d.id}`} className="text-sm text-muted hover:text-accent-ink">← Back to the deal</Link>
        <PrintButton />
      </div>
      {missing.length > 0 && (
        <p role="status" className="rounded-card bg-score-2/15 p-4 text-sm print:hidden">Not on this deal yet: {missing.join(", ")}. They show in brackets below; fill them in on the deal or by hand.</p>
      )}
      <article className="rounded-card bg-white p-10 font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-900 print:rounded-none print:p-0">{text}</article>
      <p className="text-xs text-muted print:hidden">Filled from your team&apos;s template &ldquo;{t.name}&rdquo;. Review before anyone signs.</p>
    </div>
  );
}
