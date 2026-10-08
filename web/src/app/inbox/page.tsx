import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox } from "@/components/inbox";
import { getThreads } from "@/lib/db";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading inbox" className="grid gap-4 lg:grid-cols-[320px_1fr]"><div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div><Skeleton className="hidden h-[70dvh] lg:block" /></div>}>
      <Threads />
    </Suspense>
  );
}

async function Threads() {
  return <Inbox threads={await getThreads()} />;
}
