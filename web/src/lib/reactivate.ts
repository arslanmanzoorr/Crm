// Dormant lead reactivation, no I/O: who has gone quiet, and a low-pressure note that reopens the conversation.

export type DormantLead = { id: string; name: string; type: string; stage: string; lastTouch: string | null; createdAt: string; dnc: boolean; email: boolean };

const DAY = 86_400_000;

/** Open leads with no activity for `days` (or never touched and older than that), quietest first. Never do-not-contact. */
export function dormant(leads: DormantLead[], today: string, days = 90) {
  const cutoff = Date.parse(today) - days * DAY;
  return leads
    .filter((l) => !l.dnc && !["Closed", "Lost"].includes(l.stage) && Date.parse(l.lastTouch ?? l.createdAt) <= cutoff)
    .map((l) => ({ ...l, idleDays: Math.floor((Date.parse(today) - Date.parse(l.lastTouch ?? l.createdAt)) / DAY) }))
    .sort((a, b) => b.idleDays - a.idleDays);
}

/** One note per kind of lead; the agent edits before sending. `{first_name}` is filled in per lead when logged. */
export function reactivationNote(kind: "buyer" | "seller" | "investor" | "renter" | "other", agent: string) {
  const body = {
    buyer: "Are you still thinking about buying? The market has moved since we last talked, and I'd be glad to send a few homes that fit what you wanted, or just answer questions.",
    seller: "Are you still thinking about selling? I can put together a fresh, no-obligation estimate of what your home would bring today.",
    investor: "Still looking for the right investment? A few properties have come up recently, and I'm happy to run the numbers on anything that catches your eye.",
    renter: "Still looking for a place? New rentals come up every week, and I can send you the ones that fit.",
    other: "It's been a while, so I wanted to check in. Is there anything I can help with on the real estate side?",
  }[kind];
  return `Hi {first_name}, ${agent} here. ${body}\nIf your plans have changed, just let me know and I won't keep checking in.`;
}

export const kindOf = (type: string): Parameters<typeof reactivationNote>[0] =>
  (["buyer", "seller", "investor", "renter"].includes(type) ? type : "other") as Parameters<typeof reactivationNote>[0];
