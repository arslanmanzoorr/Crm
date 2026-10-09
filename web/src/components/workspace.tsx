"use client";

import type { ReactNode } from "react";
import type { Lead, Task } from "@/lib/data";
import { Header } from "./header";
import { TopLeads } from "./leads";
import { DayTasks } from "./tasks";
import { Today } from "./today";

export function Workspace({ name, leads, total, tasks, options, deals }: { name: string; leads: Lead[]; total: number; tasks: Task[]; options: { id: string; name: string }[]; deals?: ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <Header name={name} tasks={tasks} />
      <Today leads={leads} tasks={tasks} />
      {deals}
      <TopLeads leads={leads} total={total} />
      <DayTasks tasks={tasks} leads={options} />
    </div>
  );
}
