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
