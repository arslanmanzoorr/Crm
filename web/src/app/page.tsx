import { Suspense } from "react";
import { Workspace } from "@/components/workspace";
import { getLeads, getMe, getTasks } from "@/lib/db";

export default function Home() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading workspace…</p>}>
      <Home_ />
    </Suspense>
  );
}

async function Home_() {
  const [me, leads, tasks] = await Promise.all([getMe(), getLeads(), getTasks()]);
  return <Workspace name={me.name} leads={leads} tasks={tasks} />;
}
