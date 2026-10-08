import { Suspense } from "react";
import { Publisher } from "@/components/publisher";
import { getProperties } from "@/lib/db";

export default function PublishPage({ searchParams }: PageProps<"/publish">) {
  return (
    <Suspense>
      <PublisherFor searchParams={searchParams} />
    </Suspense>
  );
}

async function PublisherFor({ searchParams }: { searchParams: PageProps<"/publish">["searchParams"] }) {
  const id = (await searchParams).property;
  return <Publisher properties={await getProperties()} initialPropertyId={typeof id === "string" ? id : ""} />;
}
