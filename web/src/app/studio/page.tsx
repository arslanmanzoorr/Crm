import type { Metadata } from "next";
import { Suspense } from "react";
import { Studio } from "@/components/studio";
import { BrandPosts, type BrandFacts } from "@/components/brand-posts";
import { VideoScript } from "@/components/video-script";
import { money } from "@/lib/data";
import { dbEnabled, getFarmData, getMe, getPastClients, getProperty, listDeals, teamToday } from "@/lib/db";
import { farmReport } from "@/lib/farm";

export const metadata: Metadata = { title: "Video Studio" };

export default function StudioPage({ searchParams }: PageProps<"/studio">) {
  return (
    <Suspense>
      <StudioFor searchParams={searchParams} />
    </Suspense>
  );
}

async function StudioFor({ searchParams }: { searchParams: PageProps<"/studio">["searchParams"] }) {
  const id = (await searchParams).property;
  const [p, me] = await Promise.all([typeof id === "string" ? getProperty(id) : undefined, getMe()]);
  return (
    <div className="flex flex-col gap-6">
      <Studio
        defaults={{
          title: p ? `Just Listed · ${p.address}` : "Just Listed",
          subtitle: p ? `${money(p.price)} · ${p.beds} bd · ${p.baths} ba · ${p.area}` : "",
          agentName: me.name,
        }}
      />
      {!p && dbEnabled && <Suspense><Brand agent={me.name} /></Suspense>}
      {p && <div className="max-w-2xl"><VideoScript facts={{ address: p.address, area: p.area, price: p.price, rent: p.listingKind === "rent", beds: p.beds, baths: p.baths, sqft: p.sqft, features: p.features, description: p.description, agent: me.name }} /></div>}
    </div>
  );
}

async function Brand({ agent }: { agent: string }) {
  const [{ testimonials }, farm, deals, today] = await Promise.all([getPastClients(), getFarmData(), listDeals(), teamToday()]);
  const year = today.slice(0, 4);
  const closed = deals.filter((d) => d.status === "closed" && d.closedAt?.startsWith(year));
  const facts: BrandFacts = {
    agent,
    testimonials: testimonials.filter((t) => t.publishOk).slice(0, 20).map((t) => ({ first: t.name.split(" ")[0], body: t.body })),
    markets: farm.areas.slice(0, 12).map((area) => {
      const r = farmReport(area, farm.listings, [], today);
      return { area, forSale: r.active, underContract: r.pending, sold90: r.sold90, medianAsking: r.medianActive, medianSold: r.medianSold };
    }).filter((m) => m.forSale + m.underContract + m.sold90 > 0),
    year: { year, closed: closed.length, buyers: closed.filter((d) => d.side === "buyer").length, sellers: closed.filter((d) => d.side === "seller").length },
  };
  return <BrandPosts facts={facts} />;
}
