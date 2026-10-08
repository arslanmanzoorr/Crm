import { Suspense } from "react";
import { Inbox } from "@/components/inbox";
import { getThreads } from "@/lib/db";

export default function InboxPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading inbox…</p>}>
      <Threads />
    </Suspense>
  );
}

async function Threads() {
  return <Inbox threads={await getThreads()} />;
}
