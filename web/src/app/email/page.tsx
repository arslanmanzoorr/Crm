import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewCampaign, SenderSettings } from "@/components/email-campaigns";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getSender, isOwnerOrAdmin, listCampaigns, type CampaignRow } from "@/lib/db";
import { emailMissing } from "@/lib/email-server";

export const metadata: Metadata = { title: "Email" };

const STATUS: Record<CampaignRow["status"], string> = { draft: "Draft", scheduled: "Scheduled", sending: "Sending", sent: "Sent", cancelled: "Cancelled" };
const when = (c: CampaignRow) => {
  const d = c.status === "scheduled" ? c.scheduledAt : c.sentAt ?? c.createdAt;
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
};

export default function EmailPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-light">Email</h1>
        <p className="mt-1 text-muted">Newsletters and market updates to your database. Automated drip emails live in <Link href="/automations" className="text-accent-ink underline">Automations</Link> as a &ldquo;send an email&rdquo; step.</p>
      </header>
      <Suspense fallback={<Skeleton className="h-64" />}><Body /></Suspense>
    </div>
  );
}

async function Body() {
  if (!dbEnabled) return <p className="text-muted">Connect the database to send email.</p>;
  const [campaigns, sender, admin] = await Promise.all([listCampaigns(), getSender(), isOwnerOrAdmin()]);
  return (
    <>
      {admin && <NewCampaign />}
      <section aria-labelledby="campaigns" className="flex flex-col gap-3">
        <h2 id="campaigns" className="text-xl">Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">No campaigns yet. Start with this month&apos;s market update: it&apos;s drafted from your own listings and sales, and you edit it before anything goes out.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link href={`/email/${c.id}`} className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-3">
                  <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate text-sm text-muted">{c.subject || "No subject yet"}</span>
                  </span>
                  <span className="text-sm text-muted">{c.status === "sent" || c.status === "sending" ? `${c.recipients} recipients · ` : ""}{when(c)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.status === "sent" ? "bg-accent/20 text-accent-ink" : c.status === "scheduled" ? "bg-score-2/20 text-score-2" : "bg-surface-3"}`}>{STATUS[c.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {admin && sender && (
        <section aria-labelledby="sender" className="flex flex-col gap-3">
          <h2 id="sender" className="text-xl">Sender</h2>
          <SenderSettings s={sender} missing={emailMissing()} />
        </section>
      )}
    </>
  );
}
