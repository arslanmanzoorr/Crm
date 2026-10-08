import { money, type Property } from "@/lib/data";
import { Chip, NotchCard } from "./ui";

export function PropertyCard({ p }: { p: Property }) {
  return (
    <NotchCard label={`Open ${p.address}`} href={`/properties/${p.id}`} className="p-3">
      <div className={`aspect-[4/3] rounded-[18px] bg-gradient-to-br ${p.tone}`} />
      <div className="p-2">
        <span className="mt-3 inline-block rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-light">{money(p.price)}</span>
        <h3 className="mt-2 text-xl font-medium">{p.address}</h3>
        <p className="text-sm text-muted">{p.area} · {p.status}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip>{p.beds} bd</Chip>
          <Chip>{p.baths} ba</Chip>
          <Chip>{p.sqft.toLocaleString()} sqft</Chip>
        </div>
      </div>
    </NotchCard>
  );
}
