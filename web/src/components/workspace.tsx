"use client";

import { useState } from "react";
import { CallPanel } from "./call-panel";
import { Header } from "./header";
import { NewLeads } from "./leads";
import { DayTasks } from "./tasks";

export function Workspace() {
  const [callWith, setCallWith] = useState<string | null>(null);

  return (
    <div className={`flex flex-col gap-10 transition-[padding] ${callWith ? "lg:pr-[400px]" : ""}`}>
      <Header />
      <NewLeads />
      <DayTasks onStartCall={(t) => setCallWith(t.contact)} />
      {callWith && <CallPanel contact={callWith} onClose={() => setCallWith(null)} />}
    </div>
  );
}
