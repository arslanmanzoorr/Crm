import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamManager } from "@/components/team";
import { Skeleton } from "@/components/ui";
import { getMembers, getRentalFeed, getSplits, getTeam, getTerritories } from "@/lib/db";
import { RentalFeedSettings } from "@/components/rental-feed-settings";
import { SplitInput } from "@/components/money-controls";
import { Territories } from "@/components/territories";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-4xl font-light">Team</h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <TeamView />
      </Suspense>
    </div>
  );
}

async function TeamView() {
  const [team, routing, territories, splits, feed] = await Promise.all([getTeam(), getMembers(), getTerritories(), getSplits(), getRentalFeed()]);
  if (!team) return <p className="text-muted">Teams need a connected database.</p>;
  const agents = team.members.filter((m) => m.role !== "assistant").map((m) => ({ id: m.userId, email: m.email }));
  return (
    <>
      <TeamManager team={team} routing={routing} siteUrl={process.env.SITE_URL ?? ""} />
      <Territories territories={territories} agents={agents} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
      <section aria-labelledby="rental-feed" className="flex flex-col gap-3">
        <h2 id="rental-feed" className="text-xl">Zillow rentals feed</h2>
        <p className="-mt-2 text-sm text-muted">Active, approved rentals with a full address go to Zillow, Trulia and HotPads automatically. Take a rental off the market and it drops off.</p>
        <RentalFeedSettings feed={feed} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
      </section>
      <section aria-labelledby="splits" className="flex flex-col gap-3">
        <h2 id="splits" className="text-xl">Commission splits</h2>
        <p className="-mt-2 text-sm text-muted">Each agent&apos;s share of the commission after referral fees. New deals start with it; it can still be changed per deal.</p>
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {agents.map((a) => (
            <li key={a.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-5 py-2 text-sm">
              <span>{a.email}</span>
              {team.me.role === "owner" || team.me.role === "admin" ? <SplitInput userId={a.id} value={splits[a.id] ?? 70} label={a.email} /> : <span>{splits[a.id] ?? 70}%</span>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
