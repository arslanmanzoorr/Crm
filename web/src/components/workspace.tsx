"use client";

import type { Lead, Task } from "@/lib/data";
import { Header } from "./header";
import { TopLeads } from "./leads";
import { DayTasks } from "./tasks";
import { Today } from "./today";

export function Workspace({ name, leads, tasks }: { name: string; leads: Lead[]; tasks: Task[] }) {
  return (
    <div className="flex flex-col gap-10">
      <Header name={name} tasks={tasks} />
      <Today leads={leads} tasks={tasks} />
      <TopLeads leads={leads} />
      <DayTasks tasks={tasks} leads={leads} />
    </div>
  );
}
