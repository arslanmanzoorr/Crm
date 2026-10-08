import type { Metadata } from "next";
import { Clapperboard, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/lead-controls";
import { Chip, Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { getProperty } from "@/lib/db";

export const metadata: Metadata = { title: "Listing" };

export default function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading listing" className="flex flex-col gap-6"><Skeleton className="aspect-[21/9]" /><Skeleton className="h-16 max-w-lg" /></div>}>
      <Listing params={params} />
    </Suspense>
  );
}

async function Listing({ params }: { params: PageProps<"/properties/[id]">["params"] }) {
  const p = await getProperty((await params).id);
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/properties" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All listings</Link>
      <div className={`aspect-[21/9] rounded-card bg-gradient-to-br ${p.tone}`} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-light">{p.address}</h1>
          <p className="text-muted">{p.area} · {p.status}</p>
        </div>
        <span className="text-5xl font-light text-accent">{money(p.price)}</span>
      </header>
      <div className="flex flex-wrap gap-2">
        <Chip>{p.beds} beds</Chip>
        <Chip>{p.baths} baths</Chip>
        <Chip>{p.sqft.toLocaleString()} sqft</Chip>
        {p.features.map((f) => <Chip key={f}>{f}</Chip>)}
      </div>
      <p className="max-w-2xl text-ink/80">{p.description}</p>
      <div className="flex flex-wrap gap-2">
        <Link href={`/studio?property=${p.id}`} className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-on-light hover:bg-accent-strong">
          <Clapperboard className="size-4" /> Make video
        </Link>
        <Link href={`/publish?property=${p.id}`} className="flex items-center gap-2 rounded-full bg-surface-light px-5 py-2.5 font-medium text-on-light hover:bg-white">
          <Send className="size-4" /> Post to socials
        </Link>
        <Link href={`/properties/${p.id}/edit`} className="flex items-center gap-2 rounded-full bg-surface-2 px-5 py-2.5 hover:bg-surface-3">
          <Pencil className="size-4" /> Edit
        </Link>
        <DeleteButton id={p.id} what="listing" />
      </div>
    </div>
  );
}
