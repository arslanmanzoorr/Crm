import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadViews } from "@/components/lead-views";
import { PipelineBoard } from "@/components/pipeline";
import { getPipeline } from "@/lib/db";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-light">Pipeline</h1>
        <LeadViews current="pipeline" />
      </header>
      <Suspense fallback={<div role="status" aria-label="Loading pipeline" className="flex gap-4 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-96 w-[85vw] shrink-0 sm:w-72" />)}</div>}>
        <Board />
      </Suspense>
    </div>
  );
}

async function Board() {
  return <PipelineBoard columns={await getPipeline()} />;
}
