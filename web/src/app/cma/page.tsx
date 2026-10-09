import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewCma } from "@/components/cma-new";
import { LocalTime } from "@/components/local-time";
import { Skeleton } from "@/components/ui";
import { opinion } from "@/lib/cma";
import { money } from "@/lib/data";
import { dbEnabled, getProperties, listCmas } from "@/lib/db";

export const metadata: Metadata = { title: "CMAs" };

export default function CmaListPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-light">Market analyses</h1>
        <p className="mt-1 text-muted">Price a home from comparable sales, show the seller what they&apos;ll net, and print a presentation.</p>
      </header>
      {dbEnabled ? <Suspense fallback={<Skeleton className="h-64" />}><List /></Suspense> : <p className="text-muted">Connect Supabase to save CMAs.</p>}
    </div>
  );
}

async function List() {
  const [cmas, listings] = await Promise.all([listCmas(), getProperties()]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <section aria-labelledby="saved" className="flex flex-col gap-3">
        <h2 id="saved" className="text-xl">Saved</h2>
        {cmas.length === 0 ? <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">No CMAs yet. Start one for your next listing appointment.</p> : (
          <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
            {cmas.map((c) => {
              const o = opinion(c.subject, c.comps, c.rates, today);
              return (
                <li key={c.id}>
                  <Link href={`/cma/${c.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-3">
                    <span className="min-w-0"><span className="block truncate font-medium">{c.address}</span><span className="text-xs text-muted">{c.comps.length} comps · updated <LocalTime ts={c.updatedAt} opts={{ month: "short", day: "numeric" }} /></span></span>
                    <span className="text-sm">{o ? `${money(o.low)} – ${money(o.high)}` : <span className="text-muted">Needs comps</span>}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby="new" className="flex h-fit flex-col gap-3 rounded-card bg-surface-2 p-5">
        <h2 id="new" className="text-lg">New CMA</h2>
        <NewCma listings={listings.filter((p) => p.status !== "Sold").map(({ id, address }) => ({ id, address }))} />
      </section>
    </div>
  );
}
