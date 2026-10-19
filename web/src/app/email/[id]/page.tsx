import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CampaignEditor } from "@/components/email-campaigns";
import { Skeleton } from "@/components/ui";
import { getCampaign, getCampaignStats, getSender } from "@/lib/db";

export const metadata: Metadata = { title: "Campaign" };

export default function CampaignPage({ params }: PageProps<"/email/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/email" className="flex min-h-11 w-fit items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft aria-hidden className="size-4" /> All campaigns</Link>
      <Suspense fallback={<Skeleton className="h-96" />}><Campaign params={params} /></Suspense>
    </div>
  );
}

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");

async function Campaign({ params }: { params: PageProps<"/email/[id]">["params"] }) {
  const { id } = await params;
  const [c, sender] = await Promise.all([getCampaign(id), getSender()]);
  if (!c) notFound();
  const stats = c.status === "sending" || c.status === "sent" ? await getCampaignStats(c.id) : null;
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-light">{c.name}</h1>
        {c.status === "scheduled" && c.scheduledAt && <p className="text-score-2">Scheduled for {new Date(c.scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>}
      </header>
      {stats && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Sent", String(stats.sent), stats.queued ? `${stats.queued} still sending` : `of ${c.recipients}`],
            ["Delivered", String(stats.delivered), pct(stats.delivered, stats.sent)],
            ["Opened", String(stats.opened), pct(stats.opened, stats.delivered || stats.sent)],
            ["Clicked", String(stats.clicked), pct(stats.clicked, stats.delivered || stats.sent)],
            ["Bounced or spam", String(stats.bounced), stats.skipped || stats.failed ? `${stats.skipped} skipped · ${stats.failed} failed` : "removed from future sends"],
          ].map(([k, v, sub]) => (
            <div key={k} className="rounded-card bg-surface-2 p-4"><dt className="text-sm text-muted">{k}</dt><dd className="mt-1 text-2xl font-light tabular-nums">{v}</dd><dd className="text-xs text-muted">{sub}</dd></div>
          ))}
        </dl>
      )}
      <CampaignEditor c={c} sender={!!sender?.fromAddress && !!sender.postal} />
    </>
  );
}
