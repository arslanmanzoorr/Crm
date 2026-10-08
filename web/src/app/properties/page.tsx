import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyDemo } from "@/components/empty-demo";
import { PropertyCard } from "@/components/property-card";
import { getProperties } from "@/lib/db";
import { LoadingCards } from "@/components/ui";

export const metadata: Metadata = { title: "Listings" };

export default function PropertiesPage() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-light">Listings</h1>
        <Link href="/properties/new" className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-on-light hover:bg-accent-strong">
          <Plus className="size-4" /> Add listing
        </Link>
      </div>
      <Suspense fallback={<LoadingCards label="Loading listings" />}>
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
