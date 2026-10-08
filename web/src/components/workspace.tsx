"use client";

import type { Lead, Task } from "@/lib/data";
import { Header } from "./header";
import { NewLeads } from "./leads";
import { DayTasks } from "./tasks";

const inWeek = (iso?: string) => !!iso && new Date(iso).getTime() - Date.now() < 7 * 864e5;

export function Workspace({ name, leads, tasks }: { name: string; leads: Lead[]; tasks: Task[] }) {
  const open = tasks.filter((t) => !t.done);
  const kpis = [
    { label: "Active deals", value: leads.filter((l) => l.stage === "Offer" || l.stage === "Under Contract").length },
    { label: "Showings this week", value: open.filter((t) => t.kind === "showing" && inWeek(t.dueAt)).length },
    { label: "Hot leads", value: leads.filter((l) => l.score >= 80).length, accent: true },
    { label: "Overdue tasks", value: open.filter((t) => t.dueAt && new Date(t.dueAt) < new Date()).length },
  ];
  return (
    <div className="flex flex-col gap-10">
      <Header name={name} kpis={kpis} tasks={tasks} />
      <NewLeads leads={leads} />
      <DayTasks tasks={tasks} leads={leads} />
    </div>
  );
}
