const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Agent = { leads: number; reached: number; touches: number; closed: number; closed_agent: number | string };
export type Window = { leads: number; agents: Agent[] };
export type Metric = { label: string; now: number; before: number; money?: boolean };

const sum = (w: Window, k: "reached" | "touches" | "closed" | "closed_agent") => w.agents.reduce((n, a) => n + Number(a[k]), 0);

/** This week vs the week before, from a 7-day and a 14-day analytics window (all counts are windowed, so 14 − 7 = last week). */
export function weekOverWeek(week: Window, twoWeeks: Window): Metric[] {
  const m = (label: string, now: number, both: number, isMoney = false): Metric => ({ label, now, before: Math.max(both - now, 0), money: isMoney });
  return [
    m("New leads", week.leads, twoWeeks.leads),
    m("Leads contacted", sum(week, "reached"), sum(twoWeeks, "reached")),
    m("Calls, texts and emails", sum(week, "touches"), sum(twoWeeks, "touches")),
    m("Deals closed", sum(week, "closed"), sum(twoWeeks, "closed")),
    m("Earned", sum(week, "closed_agent"), sum(twoWeeks, "closed_agent"), true),
  ];
}

const fmt = (x: Metric, n: number) => (x.money ? money(n) : String(n));

export function change(x: Metric): string {
  if (x.now === x.before) return "same as last week";
  const d = x.now - x.before;
  return `${d > 0 ? "up" : "down"} ${fmt(x, Math.abs(d))} from last week`;
}

/** Plain text to paste into an email or team chat. */
export function summaryText(metrics: Metric[], scope: string): string {
  return [`Weekly summary, ${scope}:`, ...metrics.map((x) => `- ${x.label}: ${fmt(x, x.now)} (${change(x)})`)].join("\n");
}
