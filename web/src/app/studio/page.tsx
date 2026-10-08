import { Suspense } from "react";
import { Studio } from "@/components/studio";
import { money } from "@/lib/data";
import { getProperty } from "@/lib/db";

export default function StudioPage({ searchParams }: PageProps<"/studio">) {
  return (
    <Suspense>
      <StudioFor searchParams={searchParams} />
    </Suspense>
  );
}

async function StudioFor({ searchParams }: { searchParams: PageProps<"/studio">["searchParams"] }) {
  const id = (await searchParams).property;
  const p = typeof id === "string" ? await getProperty(id) : undefined;
  return (
    <Studio
      defaults={{
        title: p ? `Just Listed · ${p.address}` : "Just Listed",
        subtitle: p ? `${money(p.price)} · ${p.beds} bd · ${p.baths} ba · ${p.area}` : "",
      }}
    />
  );
}
