import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CsvDownload } from "@/components/csv-download";
import { Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { dbEnabled, getAnalytics, type Analytics } from "@/lib/db";

export const metadata: Metadata = { title: "Analytics" };

const PERIODS = [30, 90, 365] as const;

export default function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-light">Analytics</h1>
        <Suspense><PeriodPicker searchParams={searchParams} /></Suspense>
      </header>
      {dbEnabled ? (
        <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-24" /><Skeleton className="h-56" /><Skeleton className="h-56" /></div>}>
          <Report searchParams={searchParams} />
        </Suspense>
      ) : <p className="text-muted">Connect Supabase to see analytics.</p>}
    </div>
  );
}

const daysOf = async (sp: PageProps<"/analytics">["searchParams"]) => {
  const d = Number((await sp).days);
  return (PERIODS as readonly number[]).includes(d) ? d : 90;
};

async function PeriodPicker({ searchParams }: { searchParams: PageProps<"/analytics">["searchParams"] }) {
  const days = await daysOf(searchParams);
  return (
    <nav aria-label="Period" className="flex gap-1 rounded-full bg-surface-2 p-1">
      {PERIODS.map((p) => (
        <Link key={p} href={`/analytics?days=${p}`} aria-current={p === days ? "page" : undefined}
          className={`flex min-h-10 items-center rounded-full px-4 text-sm ${p === days ? "bg-surface-light font-medium text-on-light" : "text-muted hover:text-ink"}`}>
          {p === 365 ? "12 months" : `${p} days`}
        </Link>
      ))}
    </nav>
  );
}

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");
const mins = (m: number | null) => (m === null ? "–" : m < 60 ? `${Math.round(m)} min` : m < 1440 ? `${(m / 60).toFixed(1)} h` : `${(m / 1440).toFixed(1)} d`);
const monthName = (ym: string) => (ym === "no date" ? "No date" : new Date(`${ym}-15T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }));

async function Report({ searchParams }: { searchParams: PageProps<"/analytics">["searchParams"] }) {
  const days = await daysOf(searchParams);
  const a = (await getAnalytics(days))!;
  const earned = a.agents.reduce((n, x) => n + Number(x.closed_agent), 0);
  const pipeline = a.forecast.reduce((n, f) => n + Number(f.agent), 0);
  const label = days === 365 ? "12 months" : `${days} days`;

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`New leads, ${label}`} value={String(a.leads)} />
        <Stat label="Median first response" value={mins(a.response.median_min)} sub={a.response.never ? `${a.response.never} never contacted` : "Every lead contacted"} warn={a.response.never > 0} />
        <Stat label="Reached within 5 min" value={pct(a.response.within_5m, a.leads)} sub={`${pct(a.response.within_1h, a.leads)} within an hour`} />
        <Stat label={`Earned, ${label}`} value={money(earned)} sub={`${money(pipeline)} in the pipeline`} accent />
      </dl>

      <Revenue a={a} />

      <Section id="sources" title="Where leads come from, and which ones close" note="Attributed to each lead's first source." csv={{
        name: `lead-sources-${label.replace(" ", "-")}`,
        header: ["Source", "Leads", "Contacted", "Qualified", "Under contract", "Closed", "Close rate", "Median first response (min)", "Spend"],
        rows: a.by_source.map((s) => [s.source, s.leads, s.reached, s.qualified, s.contracted, s.closed, pct(s.closed, s.leads), s.median_response_min ?? "", s.spend]),
      }}>
        {a.by_source.length === 0 ? <Empty>No new leads in this period.</Empty> : (
          <Table head={["Source", "Leads", "Contacted", "Qualified", "Contract", "Closed", "Close rate", "First response", "Spend", "Per lead", "Per closing"]}>
            {a.by_source.map((s) => (
              <tr key={s.source}>
                <th scope="row" className="py-2.5 pr-4 text-left font-normal">{s.source}</th>
                <Td>{s.leads}</Td><Td>{s.reached} <Dim>{pct(s.reached, s.leads)}</Dim></Td><Td>{s.qualified}</Td><Td>{s.contracted}</Td><Td>{s.closed}</Td>
                <Td><span className={s.closed ? "text-accent" : ""}>{pct(s.closed, s.leads)}</span></Td><Td>{mins(s.median_response_min)}</Td><Td>{Number(s.spend) ? money(Number(s.spend)) : "–"}</Td><Td>{Number(s.spend) && s.leads ? money(Number(s.spend) / s.leads) : "–"}</Td><Td>{Number(s.spend) && s.closed ? money(Number(s.spend) / s.closed) : "–"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section id="agents" title="Agents" note="Leads assigned in the period; touches are outbound calls, texts and emails logged." csv={{
        name: `agents-${label.replace(" ", "-")}`,
        header: ["Agent", "Role", "New leads", "Median first response (min)", "Touches", "Active deals", "Closed", "Earned"],
        rows: a.agents.map((x) => [x.email, x.role, x.leads, x.median_response_min ?? "", x.touches, x.active_deals, x.closed, x.closed_agent]),
      }}>
        <Table head={["Agent", "New leads", "First response", "Touches", "Active deals", "Closed", "Earned"]}>
          {a.agents.map((x) => (
            <tr key={x.user_id}>
              <th scope="row" className="max-w-56 truncate py-2.5 pr-4 text-left font-normal">{x.email} <Dim>{x.role}</Dim></th>
              <Td>{x.leads}</Td><Td>{mins(x.median_response_min)}</Td><Td>{x.touches}</Td><Td>{x.active_deals}</Td><Td>{x.closed}</Td><Td>{money(Number(x.closed_agent))}</Td>
            </tr>
          ))}
          {a.agents.length > 1 && (() => {
            const med = (xs: number[]) => { const v = xs.filter((n) => Number.isFinite(n)).sort((p, q) => p - q); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
            const resp = med(a.agents.map((x) => (x.median_response_min === null ? NaN : Number(x.median_response_min))));
            return (
              <tr className="text-muted">
                <th scope="row" className="py-2.5 pr-4 text-left font-normal italic">Team median</th>
                <Td>{med(a.agents.map((x) => x.leads))}</Td><Td>{mins(resp)}</Td><Td>{med(a.agents.map((x) => x.touches))}</Td><Td>{med(a.agents.map((x) => x.active_deals))}</Td><Td>{med(a.agents.map((x) => x.closed))}</Td><Td>{money(med(a.agents.map((x) => Number(x.closed_agent))) ?? 0)}</Td>
              </tr>
            );
          })()}
        </Table>
      </Section>

      <Section id="listings" title="Listings" note="Active inventory, longest on market first.">
        {a.listings.length === 0 ? <Empty>No active listings.</Empty> : (
          <Table head={["Listing", "Status", "Days on market", "Open house visitors", "Showings", "Offers", "Best offer vs. price"]}>
            {a.listings.map((l) => (
              <tr key={l.id}>
                <th scope="row" className="max-w-64 truncate py-2.5 pr-4 text-left font-normal"><Link href={`/properties/${l.id}`} className="hover:text-accent">{l.address}</Link></th>
                <Td>{l.status}</Td><Td>{l.days_on_market}</Td><Td>{l.visitors}</Td><Td>{l.showings}</Td><Td>{l.offers}{l.showings > 0 && <Dim> {pct(l.offers, l.showings)}</Dim>}</Td>
                <Td>{l.best_offer === null ? "–" : <>{money(Number(l.best_offer))} <Dim>{Number(l.best_offer) >= Number(l.price) ? "+" : "−"}{money(Math.abs(Number(l.best_offer) - Number(l.price)))}</Dim></>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section id="cohorts" title="Lead cohorts" note="Leads by the month they arrived, and how far they've come since. Last 12 months.">
        {a.cohorts.length === 0 ? <Empty>No leads in the last 12 months.</Empty> : (
          <Table head={["Month", "Leads", "Contacted", "Qualified", "Contract", "Closed"]}>
            {a.cohorts.map((k) => (
              <tr key={k.month}>
                <th scope="row" className="py-2.5 pr-4 text-left font-normal">{monthName(k.month)}</th>
                <Td>{k.leads}</Td><Td>{k.reached} <Dim>{pct(k.reached, k.leads)}</Dim></Td><Td>{k.qualified} <Dim>{pct(k.qualified, k.leads)}</Dim></Td>
                <Td>{k.contracted} <Dim>{pct(k.contracted, k.leads)}</Dim></Td><Td><span className={k.closed ? "text-accent" : ""}>{k.closed} <Dim>{pct(k.closed, k.leads)}</Dim></span></Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section id="cycle" title="Sales cycle" note="Median days, for deals opened in the period.">
        <dl className="grid grid-cols-2 gap-3 sm:max-w-lg">
          <Stat label="First contact to contract" value={a.cycle.lead_to_contract_days === null ? "–" : `${a.cycle.lead_to_contract_days} days`} />
          <Stat label="Contract to closing" value={a.cycle.contract_to_close_days === null ? "–" : `${a.cycle.contract_to_close_days} days`} />
        </dl>
      </Section>
    </>
  );
}

/** Earned per month (your share), last 12 months, then what's scheduled to close. One series, so no legend. */
function Revenue({ a }: { a: Analytics }) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - 11 + i);
    return d.toISOString().slice(0, 7);
  });
  const byMonth = new Map(a.revenue.map((r) => [r.month, r]));
  const bars = months.map((m) => ({ month: m, agent: Number(byMonth.get(m)?.agent ?? 0), deals: byMonth.get(m)?.deals ?? 0 }));
  const max = Math.max(...bars.map((b) => b.agent), 1);
  const total = bars.reduce((n, b) => n + b.agent, 0);
  return (
    <Section id="revenue" title="Earned by month" note="Your share of closed deals, last 12 months.">
      {total === 0 ? <Empty>No closed deals in the last 12 months yet. Close one from a deal page and it shows here.</Empty> : (
        <figure className="rounded-card bg-surface-2 p-5">
          <div className="flex h-44 items-end gap-0.5" role="img" aria-label={`Earned by month, total ${money(total)}. Table below.`}>
            {bars.map((b) => (
              <div key={b.month} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none">
                <div className="w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80" style={{ height: `${b.agent ? Math.max((b.agent / max) * 100, 2) : 0}%` }} />
                <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-surface-light px-2.5 py-1.5 text-xs whitespace-nowrap text-on-light group-hover:block group-focus-visible:block">
                  {monthName(b.month)}: {money(b.agent)} · {b.deals} deal{b.deals === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-0.5 text-[11px] text-muted" aria-hidden>
            {bars.map((b, i) => <span key={b.month} className="flex-1 text-center">{i % 2 === 0 ? monthName(b.month).split(" ")[0] : ""}</span>)}
          </div>
          <table className="sr-only"><caption>Earned by month</caption><tbody>{bars.map((b) => <tr key={b.month}><th>{monthName(b.month)}</th><td>{money(b.agent)}</td></tr>)}</tbody></table>
        </figure>
      )}
      {a.forecast.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm text-muted">Scheduled to close (your share)</h3>
          <ul className="flex flex-wrap gap-2">
            {a.forecast.map((f) => (
              <li key={f.month} className="rounded-card bg-surface-2 px-4 py-2.5 text-sm">
                <span className="text-muted">{monthName(f.month)}</span> {money(Number(f.agent))} <span className="text-muted">· {f.deals} deal{f.deals === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function Section({ id, title, note, csv, children }: { id: string; title: string; note?: string; csv?: { name: string; header: string[]; rows: unknown[][] }; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={id} className="text-xl">{title}</h2>
          {note && <p className="text-sm text-muted">{note}</p>}
        </div>
        {csv && csv.rows.length > 0 && <CsvDownload {...csv} />}
      </div>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card bg-surface-2 px-5" tabIndex={0} role="region" aria-label="Scrollable table">
      <table className="w-full min-w-[40rem] text-sm">
        <thead><tr className="border-b border-white/5 text-left text-muted">{head.map((h, i) => <th key={h} scope="col" className={`py-2.5 font-normal ${i ? "px-3 text-right" : "pr-4"}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}

const Td = ({ children }: { children: React.ReactNode }) => <td className="px-3 py-2.5 text-right tabular-nums">{children}</td>;
const Dim = ({ children }: { children: React.ReactNode }) => <span className="text-xs text-muted">{children}</span>;
const Empty = ({ children }: { children: React.ReactNode }) => <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">{children}</p>;

function Stat({ label, value, sub, accent, warn }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-card bg-surface-2 p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-light tabular-nums ${accent ? "text-accent" : ""}`}>{value}</dd>
      {sub && <dd className={`text-xs ${warn ? "text-score-1" : "text-muted"}`}>{sub}</dd>}
    </div>
  );
}
