import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyDemo } from "@/components/empty-demo";
import { PropertyCard } from "@/components/property-card";
import { getProperties } from "@/lib/db";

export default function PropertiesPage() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl">Properties</h1>
        <Link href="/properties/new" className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-light hover:bg-accent-strong">
          <Plus className="size-4" /> Add listing
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Loading listings…</p>}>
        <Listings />
      </Suspense>
    </section>
  );
}

async function Listings() {
  const properties = await getProperties();
  if (!properties.length) return <EmptyDemo what="listings" />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {properties.map((p) => <PropertyCard key={p.id} p={p} />)}
    </div>
  );
}
