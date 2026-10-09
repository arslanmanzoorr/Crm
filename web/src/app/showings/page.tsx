import type { Metadata } from "next";
import { Suspense } from "react";
import { ScheduleShowing, ShowingItem } from "@/components/showing-controls";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getLeadOptions, getProperties, getShowings, type Showing } from "@/lib/db";
import { conflicts } from "@/lib/showings";

export const metadata: Metadata = { title: "Showings" };

export default function ShowingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-4xl font-light">Showings</h1>
      {dbEnabled ? (
        <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>}>
          <Agenda />
        </Suspense>
      ) : <p className="text-muted">Connect Supabase to book showings.</p>}
    </div>
  );
}

async function Agenda() {
  const [buyers, listings] = await Promise.all([getLeadOptions(), getProperties()]);
  const now = new Date().getTime();
  const all = await getShowings({ from: new Date(now - 14 * 86_400_000).toISOString(), to: new Date(now + 60 * 86_400_000).toISOString() });
  const clash = conflicts(all.map((s) => ({ id: s.id, agentId: s.agentId, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status })));
  const upcoming = all.filter((s) => Date.parse(s.endsAt) >= now && (s.status === "requested" || s.status === "confirmed"));
  const feedback = all.filter((s) => Date.parse(s.endsAt) < now && !s.interest && (s.status === "confirmed" || s.status === "done")).reverse();

  // Group by calendar day in UTC on the server; times inside render in the viewer's timezone.
  // ponytail: a showing near midnight can land under the neighboring day for far-from-UTC agents
  const days = new Map<string, Showing[]>();
  for (const s of upcoming) days.set(s.startsAt.slice(0, 10), [...(days.get(s.startsAt.slice(0, 10)) ?? []), s]);

  return (
    <>
      {feedback.length > 0 && (
        <section aria-labelledby="feedback" className="flex flex-col gap-3">
          <h2 id="feedback" className="text-xl">How did it go? <span className="text-muted">({feedback.length})</span></h2>
          <p className="-mt-2 text-sm text-muted">Buyer feedback goes on their timeline and into the seller report.</p>
          <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
            {feedback.map((s) => <ShowingItem key={s.id} s={s} />)}
          </ul>
        </section>
      )}

      <section aria-labelledby="upcoming" className="flex flex-col gap-3">
        <h2 id="upcoming" className="text-xl">Coming up</h2>
        {upcoming.length === 0 && <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">No showings booked. Book one below or from a buyer&apos;s page.</p>}
        {[...days].map(([day, list]) => (
          <div key={day} className="flex flex-col gap-2">
            <h3 className="text-sm text-muted">{new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })} · {list.length} showing{list.length === 1 ? "" : "s"}</h3>
            <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
              {list.map((s) => <ShowingItem key={s.id} s={s} conflict={clash.has(s.id)} />)}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="book" className="flex max-w-2xl flex-col gap-3 rounded-card bg-surface-2 p-5">
        <h2 id="book" className="text-xl">Book a showing</h2>
        <ScheduleShowing buyers={buyers} listings={listings.filter((p) => p.status !== "Sold").map(({ id, address }) => ({ id, address }))} />
      </section>
    </>
  );
}
