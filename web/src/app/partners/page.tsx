import { Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DeletePartner, PartnerForm } from "@/components/financing-controls";
import { PARTNER_GROUPS, PARTNER_KINDS } from "@/lib/readiness";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getPartners } from "@/lib/db";

export const metadata: Metadata = { title: "Partners" };

export default function PartnersPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-light">Partners</h1>
        <p className="mt-1 text-muted">Lenders, inspectors, title and the rest of the people your clients rely on.</p>
      </header>
      {dbEnabled ? (
        <Suspense fallback={<Skeleton className="h-64" />}><Directory /></Suspense>
      ) : <p className="text-muted">Connect Supabase to keep a partner directory.</p>}
    </div>
  );
}

async function Directory() {
  const partners = await getPartners();
  const kinds = (Object.keys(PARTNER_KINDS) as (keyof typeof PARTNER_KINDS)[]).filter((k) => partners.some((p) => p.kind === k));
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="flex flex-col gap-6">
        {partners.length === 0 && <p className="rounded-card bg-surface-2 p-6 text-sm text-muted">No partners yet. Add your go-to lender first; you can then attach them to buyers&apos; financing.</p>}
        {kinds.map((k) => (
          <section key={k} aria-labelledby={`k-${k}`} className="flex flex-col gap-2">
            <h2 id={`k-${k}`} className="text-xl">{PARTNER_GROUPS[k]}</h2>
            <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
              {partners.filter((p) => p.kind === k).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-medium">{p.name}{p.company && <span className="font-normal text-muted"> · {p.company}</span>}</p>
                    {p.notes && <p className="text-sm text-ink/80">{p.notes}</p>}
                    {k === "lender" && <p className="text-xs text-muted">{p.clients} client{p.clients === 1 ? "" : "s"} with this lender</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {p.phone && <a href={`tel:${p.phone}`} aria-label={`Call ${p.name}`} className="grid size-10 place-items-center rounded-full hover:bg-surface-3"><Phone aria-hidden className="size-4" /></a>}
                    {p.email && <a href={`mailto:${p.email}`} aria-label={`Email ${p.name}`} className="grid size-10 place-items-center rounded-full hover:bg-surface-3"><Mail aria-hidden className="size-4" /></a>}
                    <DeletePartner id={p.id} name={p.name} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section aria-labelledby="add" className="flex h-fit flex-col gap-3 rounded-card bg-surface-2 p-5">
        <h2 id="add" className="text-lg">Add a partner</h2>
        <PartnerForm />
      </section>
    </div>
  );
}
