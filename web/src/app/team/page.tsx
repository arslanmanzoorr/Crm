import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamManager } from "@/components/team";
import { Skeleton } from "@/components/ui";
import { getMembers, getTeam, getTerritories } from "@/lib/db";
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
  const [team, routing, territories] = await Promise.all([getTeam(), getMembers(), getTerritories()]);
  if (!team) return <p className="text-muted">Teams need a connected database.</p>;
  const agents = team.members.filter((m) => m.role !== "assistant").map((m) => ({ id: m.userId, email: m.email }));
  return (
    <>
      <TeamManager team={team} routing={routing} siteUrl={process.env.SITE_URL ?? ""} />
      <Territories territories={territories} agents={agents} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
    </>
  );
}
