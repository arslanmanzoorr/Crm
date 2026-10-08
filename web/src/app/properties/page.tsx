import { PropertyCard } from "@/components/property-card";
import { properties } from "@/lib/data";

export default function PropertiesPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl">
        Properties <sup className="text-xs text-muted">{properties.length}</sup>
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => (
          <PropertyCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
