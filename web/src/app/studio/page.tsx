import type { Metadata } from "next";
import { Suspense } from "react";
import { Studio } from "@/components/studio";
import { money } from "@/lib/data";
import { getMe, getProperty } from "@/lib/db";

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
    <Studio
      defaults={{
        title: p ? `Just Listed · ${p.address}` : "Just Listed",
        subtitle: p ? `${money(p.price)} · ${p.beds} bd · ${p.baths} ba · ${p.area}` : "",
        agentName: me.name,
      }}
    />
  );
}
