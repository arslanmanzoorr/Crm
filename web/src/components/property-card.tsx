import { money, type Property } from "@/lib/data";
import { Chip, NotchCard } from "./ui";

export function PropertyCard({ p }: { p: Property }) {
  return (
    <NotchCard label={`Open ${p.address}`} href={`/properties/${p.id}`} className="p-3">
      {p.cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, resized on upload
        <img src={p.cover} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[18px] bg-surface-1 object-cover" />
      ) : (
        <div aria-hidden className={`grid aspect-[4/3] place-items-center rounded-[18px] bg-gradient-to-br ${p.tone}`}>
          <span className="rounded-full bg-bg/60 px-3 py-1 text-xs text-ink backdrop-blur">No photos yet</span>
        </div>
      )}
      <div className="p-2">
        <span className="mt-3 inline-block rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-light">{money(p.price)}</span>
        <h3 className="mt-2 truncate text-xl font-medium">{p.address}</h3>
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
