// Plans and prices: the one place the pricing page (and, once billing is live, checkout and limits) read from.
// Plain module so server pages, client components and the proxy share the same values.

/** Billing is not live yet: everyone is on early access, free, and the pricing page says so. Flip when Stripe is in. */
export const BILLING_LIVE = false;

export const TRIAL_DAYS = 14;
/** Yearly price = this many months (two months free). */
export const YEARLY_MONTHS = 10;
/** Roles that count as a paid seat. Assistants are always free. */
export const PAID_ROLES = ["owner", "admin", "agent"] as const;

export const PLANS = [
  {
    key: "starter",
    name: "Starter",
    monthly: 29,
    pitch: "Everything to run your leads, listings and deals.",
    includes: [
      "Leads, pipeline, tasks and Today list",
      "Lead forms, open-house sign-in and showing booking pages",
      "Listings with photos, showings, offers and deals",
      "Log calls, texts and email; send email from your Gmail",
      "Client portal and transaction coordinator links",
      "Follow-up playbooks",
      "Commission splits, caps and analytics",
      "Calculators, and export your data any time",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    monthly: 59,
    pitch: "AI that drafts the follow-up and answers your website.",
    recommended: true, // our pick, not a popularity claim (no customer data behind it yet)
    includes: [
      "Everything in Starter",
      "AI lead scores, next steps and reply drafts you approve",
      "Website chat assistant that answers from your listings and books showings",
      "Email newsletters and drip emails",
      "Market reports and farming",
      "AI contract reader for deal deadlines",
      "Listing videos and social posts",
    ],
  },
  {
    key: "team",
    name: "Team",
    monthly: 89,
    pitch: "For teams and brokerages that route leads and use their own brand.",
    includes: [
      "Everything in Pro",
      "Lead routing: round robin and territories",
      "Offices",
      "Agency mode: client sub-accounts and snapshots",
      "White-label: your logo, colors and own web address",
      "Remove “Powered by Estos” from client pages",
    ],
  },
] as const;

export type PlanKey = (typeof PLANS)[number]["key"];

/** Price per agent for one billing period, in whole US dollars. */
export const price = (monthly: number, yearly: boolean) => (yearly ? monthly * YEARLY_MONTHS : monthly);

const RANK: Record<PlanKey, number> = { starter: 0, pro: 1, team: 2 };
/** The lowest plan that includes each paid capability. Everything not listed here is in every plan. */
export const NEEDS = {
  ai: "pro", chatAssistant: "pro", email: "pro", farm: "pro", marketing: "pro",
  routing: "team", offices: "team", agency: "team", whiteLabel: "team",
} as const satisfies Record<string, PlanKey>;
export type Capability = keyof typeof NEEDS;

export const allows = (plan: PlanKey, cap: Capability) => RANK[plan] >= RANK[NEEDS[cap]];
export const isPlan = (v: unknown): v is PlanKey => typeof v === "string" && v in RANK;
export const planName = (k: PlanKey) => PLANS.find((p) => p.key === k)!.name;

/** Pages that belong to a paid capability (the proxy sends teams without it to /billing). */
export function capabilityFor(path: string): Capability | null {
  const on = (p: string) => path === p || path.startsWith(p + "/");
  if (on("/email")) return "email";
  if (on("/farm")) return "farm";
  if (on("/studio") || on("/publish") || on("/api/publish")) return "marketing";
  if (on("/agency")) return "agency";
  return null;
}

/** The message a server action returns when the team's plan doesn't include something. */
export const upgradeMessage = (cap: Capability) => `This is part of the ${planName(NEEDS[cap])} plan. An owner or admin can change plans in Account, Plan and billing.`;
