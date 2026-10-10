import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyDemo } from "@/components/empty-demo";
import { PropertyCard } from "@/components/property-card";
import { getProperties } from "@/lib/db";
import { LoadingCards } from "@/components/ui";
import { inputAuto } from "@/components/forms";
import { filterListings } from "@/lib/match";

export const metadata: Metadata = { title: "Listings" };

export default function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-light">Listings</h1>
        <Link href="/properties/new" className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-on-light hover:bg-accent-strong">
          <Plus className="size-4" /> Add listing
        </Link>
      </div>
      <Suspense fallback={<LoadingCards label="Loading listings" />}>
        <Listings searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const STATUSES = ["Active", "Coming soon", "Under contract", "Sold"];
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const num = (v: string) => (Number(v) > 0 ? Number(v) : undefined);

async function Listings({ searchParams }: { searchParams: PageProps<"/properties">["searchParams"] }) {
  const [properties, sp] = await Promise.all([getProperties(), searchParams]);
  if (!properties.length) return <EmptyDemo what="listings" />;
  const f = { kind: one(sp.kind), status: one(sp.status), maxPrice: one(sp.max), minBeds: one(sp.beds), minCap: one(sp.cap) };
  const shown = filterListings(properties, { kind: f.kind || undefined, status: f.status || undefined, maxPrice: num(f.maxPrice), minBeds: num(f.minBeds), minCap: num(f.minCap) });
  const active = Object.values(f).some(Boolean);
  const sel = (name: string, value: string, label: string, opts: [string, string][]) => (
    <select name={name} defaultValue={value} aria-label={label} className={`${inputAuto} min-w-0`}>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  return (
    <>
      <form className="flex flex-wrap items-center gap-2 rounded-card bg-surface-2 p-3" aria-label="Filter listings">
        {sel("kind", f.kind, "For sale or rent", [["", "Sale and rent"], ["sale", "For sale"], ["rent", "For rent"]])}
        {sel("status", f.status, "Status", [["", "Any status"], ...STATUSES.map((s) => [s, s] as [string, string])])}
        <input name="max" type="number" min={0} step="any" inputMode="numeric" defaultValue={f.maxPrice} placeholder="Max price" aria-label="Max price" className={`${inputAuto} w-32`} />
        <input name="beds" type="number" min={0} step={1} inputMode="numeric" defaultValue={f.minBeds} placeholder="Min beds" aria-label="Minimum bedrooms" className={`${inputAuto} w-28`} />
        <input name="cap" type="number" min={0} step="any" inputMode="decimal" defaultValue={f.minCap} placeholder="Min cap %" aria-label="Minimum cap rate, percent" title="Estimated, from each listing's estimated rent" className={`${inputAuto} w-28`} />
        <button className="min-h-11 rounded-full bg-surface-3 px-4 text-sm hover:bg-surface-1">Filter</button>
        {active && <Link href="/properties" className="min-h-11 content-center px-2 text-sm text-muted hover:text-accent">Clear</Link>}
      </form>
      {active && <p className="text-sm text-muted">{shown.length} of {properties.length} listings{f.minCap && " · cap rate estimated from each listing's estimated rent"}</p>}
      {shown.length === 0 ? <p className="rounded-card bg-surface-2 p-8 text-center text-muted">No listings match. Try loosening a filter.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </>
  );
}
