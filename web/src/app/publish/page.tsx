import type { Metadata } from "next";
import { Suspense } from "react";
import { Publisher } from "@/components/publisher";
import { getProperties } from "@/lib/db";

export const metadata: Metadata = { title: "Publish" };

export default function PublishPage({ searchParams }: PageProps<"/publish">) {
  return (
    <Suspense>
      <PublisherFor searchParams={searchParams} />
    </Suspense>
  );
}

async function PublisherFor({ searchParams }: { searchParams: PageProps<"/publish">["searchParams"] }) {
  const id = (await searchParams).property;
  // Agents' listings waiting for broker approval can't be marketed yet.
  return <Publisher properties={(await getProperties()).filter((p) => p.approved !== false)} initialPropertyId={typeof id === "string" ? id : ""} />;
}
