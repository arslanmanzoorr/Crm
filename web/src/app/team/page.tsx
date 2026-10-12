import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamManager } from "@/components/team";
import { Skeleton } from "@/components/ui";
import { getCaps, getMembers, getOffices, getRentalFeed, getSplits, getTeam, getTerritories } from "@/lib/db";
import { money } from "@/lib/data";
import { Offices } from "@/components/offices";
import { RentalFeedSettings } from "@/components/rental-feed-settings";
import { CapInput, SplitInput } from "@/components/money-controls";
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
  const [team, routing, territories, splits, feed, offices, caps] = await Promise.all([getTeam(), getMembers(), getTerritories(), getSplits(), getRentalFeed(), getOffices(), getCaps()]);
  if (!team) return <p className="text-muted">Teams need a connected database.</p>;
  const agents = team.members.filter((m) => m.role !== "assistant").map((m) => ({ id: m.userId, email: m.email }));
  return (
    <>
      <TeamManager team={team} routing={routing} siteUrl={process.env.SITE_URL ?? ""} />
      <Offices offices={offices} members={routing.members.map((m) => ({ id: m.userId, email: m.email, officeId: m.officeId }))} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
      <Territories territories={territories} agents={agents} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
      <section aria-labelledby="rental-feed" className="flex flex-col gap-3">
        <h2 id="rental-feed" className="text-xl">Zillow rentals feed</h2>
        <p className="-mt-2 text-sm text-muted">Active, approved rentals with a full address go to Zillow, Trulia and HotPads automatically. Take a rental off the market and it drops off.</p>
        <RentalFeedSettings feed={feed} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
      </section>
      <section aria-labelledby="splits" className="flex flex-col gap-3">
        <h2 id="splits" className="text-xl">Commission splits</h2>
        <p className="-mt-2 text-sm text-muted">Each agent&apos;s share of the commission after referral fees. New deals start with it; it can still be changed per deal. With an annual cap, once an agent has paid the brokerage that much this year, new deals suggest 100%.</p>
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {agents.map((a) => (
            <li key={a.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-5 py-2 text-sm">
              <span>{a.email}</span>
              <span className="flex flex-wrap items-center gap-3">
                {team.me.role === "owner" || team.me.role === "admin" ? <><SplitInput userId={a.id} value={splits[a.id] ?? 70} label={a.email} /><CapInput userId={a.id} value={caps[a.id]?.cap ?? null} label={a.email} /></> : <span>{splits[a.id] ?? 70}%{caps[a.id]?.cap ? `, cap ${money(caps[a.id].cap!)}` : ""}</span>}
                {caps[a.id]?.cap && <span className="text-xs text-muted">{money(caps[a.id].paid)} paid this year{caps[a.id].paid >= caps[a.id].cap! ? " · capped" : ""}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
