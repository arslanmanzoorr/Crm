import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TcMilestones } from "@/components/tc-milestones";
import { Skeleton } from "@/components/ui";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Transaction", robots: { index: false, follow: false } };

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
type View = {
  label: string; team: string; agent_email: string | null; address: string; side: "buyer" | "seller"; status: string; accepted_on: string; close_on: string | null; client: string;
  milestones: { id: string; title: string; due_on: string | null; done: boolean }[];
  documents: { id: string; name: string; size: number; created_at: string }[];
};
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function CoordinatorPage({ params }: PageProps<"/tc/[token]">) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <Suspense fallback={<Skeleton className="h-96" />}><Deal params={params} /></Suspense>
    </div>
  );
}

async function Deal({ params }: { params: PageProps<"/tc/[token]">["params"] }) {
  const { token } = await params;
  if (!TOKEN.test(token)) notFound();
  const { data } = await (await supabase()).rpc("tc_view", { p_token: token });
  const v = data as View | null;
  if (!v) return <p className="rounded-card bg-surface-2 p-8 text-center text-muted">This link has expired or was turned off. Ask the agent for a new one.</p>;
  const done = v.milestones.filter((m) => m.done).length;
  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted">For {v.label} · {v.team}</p>
        <h1 className="text-3xl font-light">{v.address}</h1>
        <p className="text-sm text-muted">
          {v.side === "buyer" ? "Purchase" : "Sale"} for {v.client} · accepted {day(v.accepted_on)}{v.close_on && <> · closing {day(v.close_on)}</>}{v.status !== "active" && <> · {v.status.replace("_", " ")}</>}
        </p>
      </header>
      <section aria-labelledby="steps" className="flex flex-col gap-3">
        <h2 id="steps" className="text-xl">Milestones <span className="text-sm text-muted">{done}/{v.milestones.length} done</span></h2>
        <TcMilestones token={token} milestones={v.milestones} />
      </section>
      <section aria-labelledby="files" className="flex flex-col gap-3">
        <h2 id="files" className="text-xl">Documents</h2>
        {v.documents.length === 0 ? <p className="text-sm text-muted">No documents on this deal yet.</p> : (
          <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
            {v.documents.map((d) => (
              <li key={d.id}>
                <a href={`/tc/${token}/doc/${d.id}`} className="flex min-h-12 items-center justify-between gap-3 px-5 py-2 text-sm hover:bg-surface-3">
                  <span className="min-w-0 truncate">{d.name}</span><span className="shrink-0 text-xs text-muted">{Math.max(1, Math.round(d.size / 1024))} KB</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      {v.agent_email && <p className="text-sm text-muted">Questions? Email the agent at <a href={`mailto:${v.agent_email}`} className="underline hover:text-ink">{v.agent_email}</a>.</p>}
    </>
  );
}
