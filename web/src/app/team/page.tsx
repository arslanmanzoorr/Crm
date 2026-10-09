import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamManager } from "@/components/team";
import { Skeleton } from "@/components/ui";
import { getMembers, getSplits, getTeam, getTerritories } from "@/lib/db";
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
  const [team, routing, territories, splits] = await Promise.all([getTeam(), getMembers(), getTerritories(), getSplits()]);
  if (!team) return <p className="text-muted">Teams need a connected database.</p>;
  const agents = team.members.filter((m) => m.role !== "assistant").map((m) => ({ id: m.userId, email: m.email }));
  return (
    <>
      <TeamManager team={team} routing={routing} siteUrl={process.env.SITE_URL ?? ""} />
      <Territories territories={territories} agents={agents} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
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
