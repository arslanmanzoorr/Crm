// The weekly seller update, no I/O: last 7 days of activity on a listing, written the way an agent would say it.

export type WeekActivity = {
  firstName: string; address: string; daysOnMarket: number;
  showings: { interest: string | null; feedback: string }[];
  openHouseVisitors: number;
  offers: { amount: number; status: string }[];
};

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
const usd = (x: number) => x.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function sellerUpdate(a: WeekActivity): string {
  const lines: string[] = [`Hi ${a.firstName}, here's this week at ${a.address} (${n(a.daysOnMarket, "day")} on the market):`];
  const shown = a.showings.length;
  const liked = a.showings.filter((s) => s.interest === "interested" || s.interest === "offer").length;
  if (shown) lines.push(`- ${n(shown, "showing")}${liked ? `; ${liked} of those buyers liked it` : ""}.`);
  const quotes = a.showings.map((s) => s.feedback.trim()).filter(Boolean).slice(0, 3);
  if (quotes.length) lines.push(`- What buyers said: ${quotes.map((q) => `"${q}"`).join("; ")}.`);
  if (a.openHouseVisitors) lines.push(`- ${n(a.openHouseVisitors, "visitor")} at the open house.`);
  const live = a.offers.filter((o) => ["submitted", "countered"].includes(o.status));
  if (live.length) lines.push(`- ${n(live.length, "offer")} in hand, the best at ${usd(Math.max(...live.map((o) => o.amount)))}. Let's talk through them.`);
  if (!shown && !a.openHouseVisitors && !live.length)
    lines.push("- A quiet week: no showings or offers. Let's talk about the price, photos or an open house to get more buyers through.");
  else if (shown >= 3 && !live.length) lines.push("- Good traffic but no offers yet. Buyer feedback will tell us whether price or presentation is holding them back.");
  lines.push("Happy to talk anytime.");
  return lines.join("\n");
}
