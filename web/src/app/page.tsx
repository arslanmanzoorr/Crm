import type { Metadata } from "next";
import { Suspense } from "react";
import { Reveal } from "@/components/ui";
import { Workspace } from "@/components/workspace";
import { getLeads, getMe, getTasks } from "@/lib/db";

export const metadata: Metadata = { title: "Workspace" };

export default function Home() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading your day…</p>}>
      <Home_ />
    </Suspense>
  );
}

async function Home_() {
  const [me, leads, tasks] = await Promise.all([getMe(), getLeads(), getTasks()]);
  return (
    <Reveal>
      <Workspace name={me.name} leads={leads} tasks={tasks} />
    </Reveal>
  );
}
