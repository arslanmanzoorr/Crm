// Search and answer-engine facts about Estos in one place: the public pages, the FAQ, and the structured data
// (schema.org JSON-LD) built from the same plans and playbooks the site shows, so what search engines and AI models
// read always matches the page.
import { LEGAL, LEGAL_PAGES } from "./legal.ts";
import { BILLING_LIVE, PLANS, TRIAL_DAYS, YEARLY_MONTHS } from "./plans.ts";
import { STORE } from "./store.ts";

export const SITE = LEGAL.site;
export const TAGLINE = "The real estate CRM that writes the follow-up for you";
export const SUMMARY =
  "Estos is a CRM for US real estate agents and teams. It keeps leads, listings, showings, deals and follow-up in one place, and its AI drafts replies, call openers and next steps for the agent to approve. Calls and texts are gated on consent and Do Not Call checks.";

/** Every page a search engine should know about, with how often it changes. */
export const PUBLIC_PAGES: { path: string; title: string; change: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/welcome", title: "Estos home", change: "weekly", priority: 1 },
  { path: "/pricing", title: "Pricing", change: "monthly", priority: 0.9 },
  { path: "/store", title: "Playbook store", change: "weekly", priority: 0.8 },
  ...STORE.map((s) => ({ path: `/store/${s.key}`, title: s.name, change: "monthly" as const, priority: 0.6 })),
  { path: "/legal", title: "Legal", change: "yearly", priority: 0.3 },
  ...LEGAL_PAGES.map(([title, path]) => ({ path, title, change: "yearly" as const, priority: 0.3 })),
];

export const FEATURES = [
  ["Leads", "Web forms, open-house sign-in, website chat, CSV import and an API in one list; each lead gets an AI score with the reason, a next step, and routing to the right agent."],
  ["Today", "A daily list of who to call first: overdue tasks, new leads waiting for a first reply, hot leads without a plan, showings and deal deadlines."],
  ["Inbox", "SMS, WhatsApp, email and Instagram conversations per client, with AI reply drafts that suggest real listings and are sent from the agent's own phone or mail."],
  ["Listings and showings", "Listings with photos, booking pages, showing feedback, buyer matching with plain reasons, and seller reports."],
  ["Deals", "Milestone checklists, deadline warnings, an AI contract reader, offer comparison, commission splits, caps and tiers."],
  ["Compliance", "TCPA consent and National Do Not Call scrub checks before calls and texts, calling hours, a Fair Housing wording check, and data export and deletion."],
  ["Automation", "Follow-up playbooks that create the right task on the right day, plus email newsletters and drips to consented leads."],
  ["AI assistants (MCP)", "Connect Claude, ChatGPT or Cursor; they act with exactly the agent's own access and never send messages on their own."],
] as const;

export const FAQ: { q: string; a: string; link?: { text: string; href: string } }[] = [
  { q: "What is Estos?", a: SUMMARY },
  { q: "Who counts as an agent?", a: "Every owner, admin and agent on your team. Assistants are free, so you never pay extra for help." },
  { q: "How does the free trial work?", a: BILLING_LIVE
    ? `You get ${TRIAL_DAYS} days of the full plan. We take your card when you start, show you the date your first charge happens, and email you before it does. Cancel online before then and you pay nothing.`
    : `When paid plans launch, new teams get ${TRIAL_DAYS} days of the full plan first. You'll add a card when you start, see the date of your first charge, and get an email before it happens. Cancel online before then and you pay nothing.` },
  { q: "Can I cancel any time?", a: "Yes, online, in a few clicks: the same way you signed up. Plans renew every month or year until you cancel, and you keep your plan until the end of the period you paid for.",
    link: { text: "See our refunds and cancellation policy.", href: "/legal/refunds" } },
  { q: "Are there setup fees or contracts?", a: `No setup fees, no contracts, no hidden fees. Monthly plans are month to month; yearly plans cost ${YEARLY_MONTHS} months and renew yearly. Sales tax is added where the law requires it.` },
  { q: "What happens to my data if I leave?", a: "It's yours. Owners and admins can download everything from Account at any time, and for 30 days after an account closes." },
  { q: "Do you use my data to train AI?", a: "No. AI requests only go to providers that neither store nor train on them.", link: { text: "Details are in our privacy policy.", href: "/legal/privacy" } },
  { q: "Does the AI text or email my clients by itself?", a: "No. AI drafts replies and next steps; a person sends them. The one exception is the website chat assistant, which says its answers are automated and can be switched off or taken over at any time." },
];

const faqText = (f: (typeof FAQ)[number]) => (f.link ? `${f.a} ${f.link.text}` : f.a);
const offers = () => PLANS.map((p) => ({
  "@type": "Offer", name: p.name, price: p.monthly, priceCurrency: "USD", url: `${SITE}/pricing`, description: p.pitch,
  priceSpecification: { "@type": "UnitPriceSpecification", price: p.monthly, priceCurrency: "USD", unitText: "per agent per month", billingDuration: "P1M" },
}));

export const organization = {
  "@type": "Organization", "@id": `${SITE}/#org`, name: LEGAL.product, url: SITE, logo: `${SITE}/apple-icon.png`,
  email: LEGAL.support, ...(LEGAL.entity ? { legalName: LEGAL.entity } : {}),
};

export const software = {
  "@type": "SoftwareApplication", "@id": `${SITE}/#app`, name: LEGAL.product, url: SITE, description: SUMMARY,
  applicationCategory: "BusinessApplication", applicationSubCategory: "Real estate CRM", operatingSystem: "Web, iOS, Android (installable web app)",
  audience: { "@type": "BusinessAudience", audienceType: "Real estate agents, teams and brokerages" },
  featureList: FEATURES.map(([k, v]) => `${k}: ${v}`), offers: offers(), publisher: { "@id": `${SITE}/#org` },
  screenshot: [`${SITE}/site/s-leads.png`, `${SITE}/site/s-today.png`, `${SITE}/site/s-lead.png`],
};

export const website = { "@type": "WebSite", "@id": `${SITE}/#site`, name: LEGAL.product, url: SITE, publisher: { "@id": `${SITE}/#org` }, inLanguage: "en-US" };

/**
 * Open Graph for a public page. A page that sets openGraph replaces the layout's, so each one carries the site name,
 * locale and the share card itself.
 */
export const og = (path: string, title: string, description?: string) => ({
  type: "website" as const, siteName: LEGAL.product, locale: "en_US", url: path, title, ...(description ? { description } : {}),
  images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${LEGAL.product}: ${TAGLINE}` }],
});

export const breadcrumbs = (items: [string, string][]) => ({
  "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE}${path}` })),
});

/** The @graph wrapper search engines expect, as a string safe to put inside a <script> tag. */
export function jsonLd(...nodes: object[]) {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}

/** llms.txt (llmstxt.org): what Estos is, in Markdown, with links to the pages that say more. */
export function llmsTxt(full: boolean) {
  const plans = PLANS.map((p) => `- **${p.name}**: $${p.monthly} per agent per month (yearly: ${YEARLY_MONTHS} months' price for 12). ${p.pitch}${full ? `\n${p.includes.map((i) => `  - ${i}`).join("\n")}` : ""}`).join("\n");
  const store = STORE.map((s) => `- [${s.name}](${SITE}/store/${s.key}): ${s.why} Starts when ${s.when.toLowerCase()}; ${s.taskCount} tasks over ${s.span}.`).join("\n");
  return `# ${LEGAL.product}

> ${SUMMARY}

${LEGAL.product} is web software at ${SITE} (installable on phones). Assistants are free; owners, admins and agents are billed per seat.${BILLING_LIVE ? "" : " It is free during early access while billing is finished; the prices below are the launch prices."}

## Features

${FEATURES.map(([k, v]) => `- **${k}**: ${v}`).join("\n")}

## Pricing

${plans}

All prices in US dollars, plus sales tax where it applies. ${TRIAL_DAYS}-day free trial. No setup fees or contracts. Details: [Pricing](${SITE}/pricing)

## Questions

${FAQ.map((f) => `### ${f.q}\n\n${faqText(f)}`).join("\n\n")}

## Pages

- [Home](${SITE}/welcome): product tour
- [Pricing](${SITE}/pricing): plans, trial and FAQ
- [Playbook store](${SITE}/store): ready-made follow-up sequences
${LEGAL_PAGES.map(([t, p]) => `- [${t}](${SITE}${p})`).join("\n")}
${full ? `\n## Playbooks\n\n${store}\n` : `\n## Optional\n\n- [Full version of this file](${SITE}/llms-full.txt): every plan feature and every playbook\n`}
## Contact

Support: ${LEGAL.support} · Privacy: ${LEGAL.privacy}
`;
}
