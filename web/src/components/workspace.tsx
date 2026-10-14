"use client";

import type { ReactNode } from "react";
import type { Task } from "@/lib/data";
import { Header } from "./header";

/** Today: the header, then the sections in this person's chosen order. */
export function Workspace({ name, tasks, children }: { name: string; tasks: Task[]; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <Header name={name} tasks={tasks} />
      {children}
    </div>
  );
}
