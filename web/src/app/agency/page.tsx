import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AgencySettings, EnterButton, NewSubaccount, SnapshotTools } from "@/components/agency";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getAgency, type SubAccount } from "@/lib/db";
import { fmtWait } from "@/lib/response";

export const metadata: Metadata = { title: "Agency" };

export default function AgencyPage() {
  return (
    <Suspense fallback={<div className="flex flex-col gap-6"><Skeleton className="h-16 max-w-md" /><Skeleton className="h-28" /><Skeleton className="h-80" /></div>}>
      <Agency />
    </Suspense>
  );
}

const ago = (ts: string | null) => {
  if (!ts) return "No activity yet";
  const d = Math.floor((Date.now() - Date.parse(ts)) / 86_400_000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
};

async function Agency() {
  if (!dbEnabled) redirect("/account");
  const a = await getAgency();
  if (!a) redirect("/account#agency");
  const sum = (k: keyof SubAccount) => a.subs.reduce((n, s) => n + Number(s[k] ?? 0), 0);
  const unanswered = sum("unanswered_30d");
  const subs = a.subs.map((s) => ({ id: s.id, name: s.name }));
  const snaps = a.snapshots.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-sm text-muted">Agency</p>
        <h1 className="text-4xl font-light">{a.name}</h1>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Sub-accounts", String(a.subs.length)],
          ["New leads, 30 days", String(sum("leads_30d"))],
          ["Never answered, 30 days", String(unanswered)],
          ["Active deals", String(sum("active_deals"))],
          ["Closed, 30 days", String(sum("closed_30d"))],
        ].map(([k, v]) => (
          <div key={k} className="rounded-card bg-surface-2 p-4">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className={`mt-1 text-3xl font-light tabular-nums ${k.startsWith("Never") && unanswered > 0 ? "text-score-1" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="subs" className="flex flex-col gap-3">
        <h2 id="subs" className="text-xl">Sub-accounts</h2>
        {a.subs.length === 0 ? (
          <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">No sub-accounts yet. Create one below; you can copy your own setup into it with a snapshot.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
            {a.subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted">{s.users} {s.users === 1 ? "user" : "users"} · {ago(s.last_activity)}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  <div><dt className="text-xs text-muted">Leads (30d)</dt><dd className="tabular-nums">{s.leads_30d}</dd></div>
                  <div><dt className="text-xs text-muted">Never answered</dt><dd className={`tabular-nums ${s.unanswered_30d ? "font-medium text-score-1" : ""}`}>{s.unanswered_30d}</dd></div>
                  <div><dt className="text-xs text-muted">First reply</dt><dd className="tabular-nums">{s.median_response_min === null ? "–" : fmtWait(Number(s.median_response_min))}</dd></div>
                  <div><dt className="text-xs text-muted">Deals active / closed</dt><dd className="tabular-nums">{s.active_deals} / {s.closed_30d}</dd></div>
                </dl>
                <EnterButton orgId={s.id} name={s.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <NewSubaccount agencyId={a.id} snapshots={snaps} />
        <SnapshotTools subs={subs} snapshots={snaps} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AgencySettings id={a.id} name={a.name} color={a.brandColor} />
        <section aria-labelledby="staff" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 text-sm">
          <h3 id="staff" className="font-medium">Agency staff</h3>
          <ul className="flex flex-col divide-y divide-line/5">
            {a.staff.map((m) => <li key={m.email} className="flex min-h-11 items-center justify-between gap-3"><span className="truncate">{m.email}</span><span className="text-muted capitalize">{m.role}</span></li>)}
          </ul>
          <p className="text-muted">Staff can open every sub-account. They join it as agency staff, stay out of lead rotation, and are marked &ldquo;Agency&rdquo; on its team page.</p>
        </section>
      </div>
    </div>
  );
}
