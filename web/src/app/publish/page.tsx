import { Suspense } from "react";
import { Publisher } from "@/components/publisher";

export default function PublishPage({ searchParams }: PageProps<"/publish">) {
  return (
    <Suspense>
      <PublisherFor searchParams={searchParams} />
    </Suspense>
  );
}

async function PublisherFor({ searchParams }: { searchParams: PageProps<"/publish">["searchParams"] }) {
  const id = (await searchParams).property;
  return <Publisher initialPropertyId={typeof id === "string" ? id : ""} />;
}
