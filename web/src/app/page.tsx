import type { Metadata } from "next";
import { Suspense } from "react";
import { Reveal } from "@/components/ui";
import { Workspace } from "@/components/workspace";
import { getLeadOptions, getMe, getTasks, getTopLeads } from "@/lib/db";

export const metadata: Metadata = { title: "Workspace" };

export default function Home() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading your day…</p>}>
      <Home_ />
    </Suspense>
  );
}

async function Home_() {
  const [me, top, tasks, options] = await Promise.all([getMe(), getTopLeads(), getTasks(), getLeadOptions()]);
  return (
    <Reveal>
      <Workspace name={me.name} leads={top.leads} total={top.total} tasks={tasks} options={options} />
    </Reveal>
  );
}
