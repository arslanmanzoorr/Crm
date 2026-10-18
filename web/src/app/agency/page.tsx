import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AgencyLogo, AgencySettings, BillingCell, EnterButton, NewSubaccount, SnapshotTools, StaffManager } from "@/components/agency";
import { DomainSettings } from "@/components/domain-settings";
import { setAgencyDomain, verifyAgencyDomain } from "@/lib/actions";
import { domainToken } from "@/lib/domain";
import { domainDns } from "@/lib/vercel";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getAgency, supabase, type SubAccount } from "@/lib/db";
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
  const [a, { data: auth }] = await Promise.all([getAgency(), (await supabase()).auth.getUser()]);
  if (!a) redirect("/account#agency");
  const me = auth.user?.id ?? "";
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
                <BillingCell orgId={s.id} name={s.name} status={s.billing_status} price={s.billing_price === null ? null : Number(s.billing_price)} note={s.billing_note} />
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
        <div className="flex flex-col gap-4">
          <AgencySettings id={a.id} name={a.name} color={a.brandColor} />
          <div className="rounded-card bg-surface-2 p-5"><AgencyLogo agencyId={a.id} logo={a.logo} name={a.name} /></div>
        </div>
        <StaffManager agencyId={a.id} me={me} isOwner={a.role === "owner"} staff={a.staff} invites={a.invites} site={process.env.SITE_URL ?? ""} />
      </div>

      {a.role === "owner" && (
        <section aria-labelledby="app-domain" className="flex flex-col gap-3">
          <h2 id="app-domain" className="text-xl">Your app domain</h2>
          <p className="-mt-2 text-sm text-muted">Run the whole app on your own address. Sign-in shows your name, logo and color, and the app installs under your name. Clients never see EstateOS.</p>
          <DomainSettings key={a.appDomain ?? ""} domain={a.appDomain} verified={a.domainVerified} token={await domainToken(`agency:${a.id}`)}
            dns={a.appDomain && a.domainVerified ? await domainDns(a.appDomain) : null}
            save={setAgencyDomain.bind(null, a.id)} verify={verifyAgencyDomain.bind(null, a.id)} example="app.youragency.com"
            liveNote={`Your team and clients can sign in at https://${a.appDomain}. Add it to Supabase Auth's redirect URLs so sign-in emails link back here.`} />
        </section>
      )}
    </div>
  );
}
