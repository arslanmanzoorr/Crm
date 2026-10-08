import { Suspense } from "react";
import { Workspace } from "@/components/workspace";
import { getLeads } from "@/lib/db";

export default function Home() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading workspace…</p>}>
      <Home_ />
    </Suspense>
  );
}

async function Home_() {
  return <Workspace leads={await getLeads()} />;
}
