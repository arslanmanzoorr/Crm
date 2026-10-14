import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamManager } from "@/components/team";
import { Skeleton } from "@/components/ui";
import { getCaps, getMembers, getOffices, getRentalFeed, getSplits, getTeam, getTerritories, getTiers, getBranding, getApiKeys, getCompliance } from "@/lib/db";
import { ComplianceSettings } from "@/components/compliance-settings";
import { ApiKeys } from "@/components/api-keys";
import { BrandSettings } from "@/components/brand-settings";
import { tierSplit } from "@/lib/deals";
import { money } from "@/lib/data";
import { Offices } from "@/components/offices";
import { RentalFeedSettings } from "@/components/rental-feed-settings";
import { CapInput, SplitInput, TierEditor } from "@/components/money-controls";
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
  const [team, routing, territories, splits, feed, offices, caps, tiers, brand, apiKeys, rules] = await Promise.all([getTeam(), getMembers(), getTerritories(), getSplits(), getRentalFeed(), getOffices(), getCaps(), getTiers(), getBranding(), getApiKeys(), getCompliance()]);
  if (!team) return <p className="text-muted">Teams need a connected database.</p>;
  const agents = team.members.filter((m) => m.role !== "assistant").map((m) => ({ id: m.userId, email: m.email }));
  return (
    <>
      <TeamManager team={team} routing={routing} siteUrl={process.env.SITE_URL ?? ""} />
      <Offices offices={offices} members={routing.members.map((m) => ({ id: m.userId, email: m.email, officeId: m.officeId }))} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
      <Territories territories={territories} agents={agents} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
      {(team.me.role === "owner" || team.me.role === "admin") && (
        <section aria-labelledby="compliance" className="flex flex-col gap-3">
          <h2 id="compliance" className="text-xl">Calling hours and recording</h2>
          <ComplianceSettings start={rules.start} end={rules.end} allParty={rules.allParty} />
        </section>
      )}
      {(team.me.role === "owner" || team.me.role === "admin") && (
        <section aria-labelledby="branding" className="flex flex-col gap-3">
          <h2 id="branding" className="text-xl">Branding</h2>
          <p className="-mt-2 text-sm text-muted">Your color on lead forms, open house sign-in, showing booking and the client portal.</p>
          <BrandSettings color={brand.color} hide={brand.hide} />
        </section>
      )}
      {(team.me.role === "owner" || team.me.role === "admin") && (
        <section aria-labelledby="api" className="flex flex-col gap-3">
          <h2 id="api" className="text-xl">API keys</h2>
          <p className="-mt-2 text-sm text-muted">Connect your website or other tools: send leads in, read leads and listings out.</p>
          <ApiKeys keys={apiKeys} base={process.env.SITE_URL ?? ""} />
        </section>
      )}
      <section aria-labelledby="rental-feed" className="flex flex-col gap-3">
        <h2 id="rental-feed" className="text-xl">Zillow rentals feed</h2>
        <p className="-mt-2 text-sm text-muted">Active, approved rentals with a full address go to Zillow, Trulia and HotPads automatically. Take a rental off the market and it drops off.</p>
        <RentalFeedSettings feed={feed} canEdit={team.me.role === "owner" || team.me.role === "admin"} />
      </section>
      <section aria-labelledby="splits" className="flex flex-col gap-3">
        <h2 id="splits" className="text-xl">Commission splits</h2>
        <p className="-mt-2 text-sm text-muted">Each agent&apos;s share of the commission after referral fees. New deals start with it; it can still be changed per deal. With an annual cap, once an agent has paid the brokerage that much this year, new deals suggest 100%. Tiers raise the split for everyone once their gross commission closed this year passes a threshold.</p>
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {agents.map((a) => (
            <li key={a.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-5 py-2 text-sm">
              <span>{a.email}</span>
              <span className="flex flex-wrap items-center gap-3">
                {team.me.role === "owner" || team.me.role === "admin" ? <><SplitInput userId={a.id} value={splits[a.id] ?? 70} label={a.email} /><CapInput userId={a.id} value={caps[a.id]?.cap ?? null} label={a.email} /></> : <span>{splits[a.id] ?? 70}%{caps[a.id]?.cap ? `, cap ${money(caps[a.id].cap!)}` : ""}</span>}
                {caps[a.id]?.cap && <span className="text-xs text-muted">{money(caps[a.id].paid)} paid this year{caps[a.id].paid >= caps[a.id].cap! ? " · capped" : ""}</span>}
                {tierSplit(tiers, caps[a.id]?.gci ?? 0, splits[a.id] ?? 70) > (splits[a.id] ?? 70) && <span className="text-xs text-accent">tier: {tierSplit(tiers, caps[a.id]?.gci ?? 0, splits[a.id] ?? 70)}% ({money(caps[a.id].gci)} GCI this year)</span>}
              </span>
            </li>
          ))}
        </ul>
        {(team.me.role === "owner" || team.me.role === "admin") ? <TierEditor tiers={tiers} /> : tiers.length > 0 && (
          <p className="text-sm text-muted">Tiers: {tiers.map((t) => `${t.split}% after ${money(t.gci)} GCI`).join(", ")}.</p>
        )}
      </section>
    </>
  );
}
