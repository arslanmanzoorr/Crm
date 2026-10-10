import type { Metadata } from "next";
import { Suspense } from "react";
import { FarmNote } from "@/components/farm-note";
import { input, primaryBtn } from "@/components/forms";
import { Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { dbEnabled, getFarmData, getMe } from "@/lib/db";
import { areaKey, farmNote, farmReport } from "@/lib/farm";

export const metadata: Metadata = { title: "Farming" };

/** Geographic farming: pick a neighborhood, see its market from the team's listings, and touch everyone who's due. */
export default function FarmPage({ searchParams }: PageProps<"/farm">) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-light">Farming</h1>
        <p className="mt-1 text-muted">Pick a neighborhood, send a market note, and keep every lead there warm.</p>
      </header>
      {dbEnabled ? (
        <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>}>
          <Farm searchParams={searchParams} />
        </Suspense>
      ) : <p className="text-muted">Connect Supabase to farm a neighborhood.</p>}
    </div>
  );
}

async function Farm({ searchParams }: { searchParams: PageProps<"/farm">["searchParams"] }) {
  const [{ area: raw }, { areas, listings, people }, me] = await Promise.all([searchParams, getFarmData(), getMe()]);
  if (areas.length === 0)
    return <p className="rounded-card bg-surface-2 p-8 text-center text-muted">No neighborhoods yet. Add an area to a listing or a lead, or set up territories on the Team page.</p>;
  const area = areas.find((a) => areaKey(a) === areaKey(typeof raw === "string" ? raw : "")) ?? areas[0];
  const here = people.filter((p) => p.areas.some((a) => areaKey(a) === areaKey(area)));
  const r = farmReport(area, listings, here, new Date().toISOString().slice(0, 10)); // ponytail: UTC day, as on /deals
  const stats: [string, number, number | null][] = [
    ["For sale", r.active, r.medianActive], ["Under contract", r.pending, null],
    ["Sold, last 90 days", r.sold90, r.medianSold], ["Leads here", here.length, null],
  ];
  return (
    <>
      <form className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-60 flex-1 flex-col gap-1.5 text-sm sm:flex-none"><span className="text-muted">Neighborhood</span>
          <select name="area" defaultValue={area} className={input}>{areas.map((a) => <option key={a}>{a}</option>)}</select>
        </label>
        <button className={primaryBtn}>Show</button>
      </form>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([k, v, med]) => (
          <div key={k} className="rounded-card bg-surface-2 p-4">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="mt-1 text-2xl font-light">{v}</dd>
            {med !== null && <dd className="text-sm text-muted">typically {money(med)}</dd>}
          </div>
        ))}
      </dl>
      <p className="-mt-4 text-xs text-muted">Medians from your team&apos;s own listings. Full-market numbers arrive with the MLS connection.</p>
      <section aria-labelledby="note" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 sm:p-6">
        <h2 id="note" className="text-xl">Market note</h2>
        <p className="text-sm text-muted">{r.due.length ? `${r.due.length} ${r.due.length === 1 ? "lead hasn't" : "leads haven't"} heard from you in 60 days. Do-not-contact leads are left out.` : "Everyone here has heard from you in the last 60 days."}</p>
        <FarmNote key={area} draft={farmNote(area, r, me.name)} due={r.due} />
      </section>
    </>
  );
}
