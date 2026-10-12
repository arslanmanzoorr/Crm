import type { Metadata } from "next";
import { Suspense } from "react";
import { FarmNote } from "@/components/farm-note";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getDormantCandidates, getMe, teamToday } from "@/lib/db";
import { dormant, kindOf, reactivationNote } from "@/lib/reactivate";

export const metadata: Metadata = { title: "Reactivate" };

const DAYS = 90;
const GROUPS = { buyer: "Buyers", seller: "Sellers", investor: "Investors", renter: "Renters", other: "Everyone else" } as const;

/** Leads who went quiet: one check-in note per kind of lead, logged on each lead as it's sent. */
export default function ReactivatePage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-light">Reactivate</h1>
        <p className="mt-1 text-muted">Open leads nobody has touched in {DAYS} days. A short check-in brings many of them back.</p>
      </header>
      {dbEnabled ? (
        <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>}>
          <Groups />
        </Suspense>
      ) : <p className="text-muted">Connect Supabase to find quiet leads.</p>}
    </div>
  );
}

async function Groups() {
  const [candidates, today, me] = await Promise.all([getDormantCandidates(DAYS), teamToday(), getMe()]);
  const quiet = dormant(candidates, today, DAYS);
  if (quiet.length === 0) return <p className="rounded-card bg-surface-2 p-8 text-center text-muted">No quiet leads. Everyone open has heard from you in the last {DAYS} days.</p>;
  const by = Object.groupBy(quiet, (l) => kindOf(l.type));
  return (Object.keys(GROUPS) as (keyof typeof GROUPS)[]).filter((k) => by[k]?.length).map((k) => (
    <section key={k} aria-labelledby={`g-${k}`} className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 sm:p-6">
      <h2 id={`g-${k}`} className="text-xl">{GROUPS[k]} <span className="text-muted">({by[k]!.length})</span></h2>
      <p className="text-sm text-muted">Quietest first: {by[k]!.slice(0, 3).map((l) => `${l.name} (${l.idleDays} days)`).join(", ")}{by[k]!.length > 3 ? "…" : ""}</p>
      <FarmNote label="Check-in" draft={reactivationNote(k, me.name)} due={by[k]!.map((l) => ({ id: l.id, name: l.name, email: l.email }))} />
    </section>
  ));
}
