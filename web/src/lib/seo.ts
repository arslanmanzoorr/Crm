// Search and answer-engine facts about Estos in one place: the public pages, the features, the FAQ, and the
// structured data (schema.org JSON-LD) built from the same plans and playbooks the site shows, so what search engines
// and AI models read always matches the page. Every claim here must be true of the product today: AI engines quote
// this text nearly word for word.
import { LEGAL, LEGAL_PAGES } from "./legal.ts";
import { BILLING_LIVE, PLANS, TRIAL_DAYS, YEARLY_MONTHS } from "./plans.ts";
import { STORE } from "./store.ts";

export const SITE = LEGAL.site;
export const TAGLINE = "The real estate CRM that writes the follow-up for you";
export const SUMMARY =
  "Estos is a CRM for US real estate agents and teams. It keeps leads, listings, showings, deals and follow-up in one place, and its AI drafts replies, call openers and next steps for the agent to approve. Calls and texts wait for the lead's consent, a recorded Do Not Call check and the team's calling hours.";
/** "Estos" is also a French commune and an unrelated German software company; say which one we are. */
export const DISAMBIGUATION = "Estos (estos.app) is a US real estate CRM. It is not affiliated with estos GmbH or its ProCall software.";

/** Bump when the marketing copy changes; it is the sitemap's lastmod for those pages, never "now". */
export const COPY_UPDATED = "2026-11-15";

/** Topic pages: [path, title, one-line summary for llms.txt]. */
export const TOPICS = [
  ["/tcpa-compliant-crm", "TCPA and Do Not Call", "how Estos checks consent, the Do Not Call Registry and calling hours before a call or text"],
  ["/teams", "Estos for teams", "lead routing, the first-reply watchdog, splits, caps and tiers, offices and white-label"],
  ["/ai", "AI follow-up", "what the AI drafts, how scores are explained, the contract reader and the guardrails"],
  ["/security", "Security", "team isolation, two-step sign-in, encryption, private links, AI without data retention and where data lives"],
] as const;

/** Every page a search engine should know about. Robots rules and the sitemap are both built from this list. */
export const PUBLIC_PAGES: { path: string; title: string; updated: string }[] = [
  { path: "/welcome", title: "Estos home", updated: COPY_UPDATED },
  { path: "/pricing", title: "Pricing", updated: COPY_UPDATED },
  { path: "/store", title: "Playbook store", updated: COPY_UPDATED },
  ...TOPICS.map(([path, title]) => ({ path, title, updated: COPY_UPDATED })),
  ...STORE.map((s) => ({ path: `/store/${s.key}`, title: s.name, updated: COPY_UPDATED })),
  { path: "/legal", title: "Legal", updated: LEGAL.updatedIso },
  ...LEGAL_PAGES.map(([title, path]) => ({ path, title, updated: LEGAL.updatedIso })),
];

export const FEATURES = [
  ["Leads", "Web forms, open-house sign-in, website chat, CSV import and an API in one list; each lead gets an AI score with the reason, a next step, and routing to the right agent."],
  ["Today", "A daily list of who to call first: overdue tasks, new leads waiting for a first reply, hot leads without a plan, showings and deal deadlines."],
  ["Inbox", "One conversation history per client: email sent from your own Gmail once you connect it, plus calls, texts, WhatsApp and Instagram messages you log, with AI reply drafts you approve that suggest only your own listings."],
  ["Listings and showings", "Listings with photos, online showing booking, showing feedback, buyer matching with plain reasons, and seller reports."],
  ["Deals", "Milestone checklists, deadline warnings, an AI contract reader, offer comparison, commission splits, caps and tiers."],
  ["Compliance", "Calls wait for the lead's consent or a National Do Not Call Registry check the agent records (good for 31 days), and the team's calling hours inside the federal 8am to 9pm window; texts need the lead's consent. A Fair Housing check flags listing wording before it goes out. Data export and deletion are built in."],
  ["Automation", "Follow-up playbooks that create the right task on the right day, plus email newsletters and drip emails to leads who agreed to email."],
  ["AI assistants (MCP)", `Connect Claude, ChatGPT or Cursor at ${LEGAL.site}/api/mcp; they act with exactly the agent's own access and never send messages on their own.`],
] as const;

/** What people often expect from a real estate CRM that Estos does not do yet. Saying so keeps AI answers honest. */
export const NOT_YET = [
  "MLS/IDX listing search or an IDX website",
  "Built-in calling and texting (calls and texts go from the agent's own phone and are logged)",
  "Sending WhatsApp or Instagram messages from inside Estos",
  "E-signature",
  "Two-way calendar sync (showings export as calendar files; Google Calendar sync needs Google connected)",
] as const;

export const FAQ: { q: string; a: string; link?: { text: string; href: string } }[] = [
  { q: "What is Estos?", a: SUMMARY },
  { q: "Who counts as an agent?", a: "Every owner, admin and agent on your team. Assistants are free, so you never pay extra for help." },
  { q: "How does the free trial work?", a: BILLING_LIVE
    ? `You get ${TRIAL_DAYS} days of the full plan. We take your card when you start, show you the date your first charge happens, and email you before it does. Cancel online before then and you pay nothing.`
    : `Estos is free during early access. When paid plans launch, new teams get ${TRIAL_DAYS} days of the full plan first. You'll add a card when you start, see the date of your first charge, and get an email before it happens. Cancel online before then and you pay nothing.` },
  { q: "Can I cancel any time?", a: "Yes, online, in a few clicks: the same way you signed up. Plans renew every month or year until you cancel, and you keep your plan until the end of the period you paid for.",
    link: { text: "See our refunds and cancellation policy.", href: "/legal/refunds" } },
  { q: "Are there setup fees or contracts?", a: `No setup fees, no contracts, no hidden fees. Monthly plans are month to month; yearly plans cost ${YEARLY_MONTHS} months and renew yearly. Sales tax is added where the law requires it.` },
  { q: "What happens to my data if I leave?", a: "It's yours. Owners and admins can download everything from Account at any time, and for 30 days after an account closes.",
    link: { text: "How we handle data.", href: "/legal/privacy" } },
  { q: "Do you use my data to train AI?", a: "No. AI requests go through OpenRouter with data collection switched off, so they only reach model providers that don't store or train on your data.",
    link: { text: "Details are in our privacy policy.", href: "/legal/privacy" } },
  { q: "Does the AI text or email my clients by itself?", a: "No. AI drafts replies and next steps; a person sends them. The one exception is the website chat assistant, which says its answers are automated and can be switched off or taken over at any time." },
  { q: "Can I import my leads from another CRM?", a: "Yes. Upload a CSV from any CRM or spreadsheet; Estos maps the columns and matches existing leads by email or phone. Imported leads start with calling, texting and emailing switched off unless you confirm you hold their consent." },
];

const faqText = (f: (typeof FAQ)[number]) => (f.link ? `${f.a} ${f.link.text}` : f.a);

// ---------------------------------------------------------------------------------------------------------------
// Structured data. Every node carries an @id so pages can link them; each page repeats the nodes it references,
// because @id references only resolve inside one page's JSON-LD.

const ORG = { "@id": `${SITE}/#org` };
const APP = { "@id": `${SITE}/#app` };
const AVAIL = BILLING_LIVE ? "https://schema.org/InStock" : "https://schema.org/PreOrder";
const spec = (price: number, unitText: string, billingDuration: string) => ({ "@type": "UnitPriceSpecification", price, priceCurrency: "USD", unitText, billingDuration });

export const organization = {
  "@type": "Organization", ...ORG, name: LEGAL.product, url: SITE, slogan: TAGLINE, description: SUMMARY, disambiguatingDescription: DISAMBIGUATION,
  logo: { "@type": "ImageObject", "@id": `${SITE}/#logo`, url: `${SITE}/apple-icon.png`, contentUrl: `${SITE}/apple-icon.png`, width: 180, height: 180 },
  email: LEGAL.support,
  contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: LEGAL.support, areaServed: "US", availableLanguage: "en" },
  ...(LEGAL.entity ? { legalName: LEGAL.entity } : {}),
  // sameAs: add the real LinkedIn / YouTube / X profile URLs here once they exist. Never placeholders.
};

export const website = { "@type": "WebSite", "@id": `${SITE}/#site`, name: LEGAL.product, url: SITE, description: TAGLINE, publisher: ORG, inLanguage: "en-US" };

/** The product. Offers only where the prices are on the page (pricing), never on pages that just link to them. */
export const software = (withOffers: boolean) => ({
  "@type": "WebApplication", ...APP, name: LEGAL.product, url: SITE, description: SUMMARY, disambiguatingDescription: DISAMBIGUATION,
  applicationCategory: "BusinessApplication", applicationSubCategory: "Real estate CRM",
  operatingSystem: "Web (installable on iOS and Android)", browserRequirements: "Requires JavaScript and a modern browser", inLanguage: "en-US",
  audience: { "@type": "BusinessAudience", audienceType: "Real estate agents, teams and brokerages", geographicArea: { "@type": "Country", name: "US" } },
  featureList: FEATURES.map(([k, v]) => `${k}: ${v}`), publisher: ORG, dateModified: COPY_UPDATED,
  screenshot: [`${SITE}/site/s-leads.png`, `${SITE}/site/s-today.png`, `${SITE}/site/s-lead.png`],
  ...(withOffers ? { offers: {
    "@type": "AggregateOffer", priceCurrency: "USD", offerCount: PLANS.length,
    lowPrice: Math.min(...PLANS.map((p) => p.monthly)), highPrice: Math.max(...PLANS.map((p) => p.monthly)),
    offers: PLANS.map((p) => ({
      "@type": "Offer", "@id": `${SITE}/pricing#${p.key}`, name: p.name, description: p.pitch, url: `${SITE}/pricing`,
      price: p.monthly, priceCurrency: "USD", availability: AVAIL, eligibleRegion: { "@type": "Country", name: "US" }, seller: ORG,
      priceSpecification: [spec(p.monthly, "per agent per month", "P1M"), spec(p.monthly * YEARLY_MONTHS, "per agent per year", "P1Y")],
    })),
  } } : {}),
});

export const breadcrumbs = (items: [string, string][]) => ({
  "@type": "BreadcrumbList", "@id": `${SITE}${items[items.length - 1][1]}#breadcrumb`,
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE}${path}` })),
});

/** The page itself, linked to the site, the publisher and (when given) its breadcrumb and main entity. */
export const webPage = (path: string, name: string, description: string, type = "WebPage", extra: object = {}) => ({
  "@type": type, "@id": `${SITE}${path}#webpage`, url: `${SITE}${path}`, name, description, inLanguage: "en-US",
  isPartOf: { "@id": `${SITE}/#site` }, publisher: ORG, ...extra,
});

/** The @graph wrapper search engines expect, as a string safe to put inside a <script> tag. */
export function jsonLd(...nodes: object[]) {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}

/**
 * Open Graph for a public page. A page that sets openGraph replaces the layout's, so each one carries the site name,
 * locale and the share card itself.
 */
export const og = (path: string, title: string, description?: string) => ({
  type: "website" as const, siteName: LEGAL.product, locale: "en_US", url: path, title, ...(description ? { description } : {}),
  images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${LEGAL.product}: ${TAGLINE}` }],
});

/** Metadata for a simple public page: title, description, canonical and share card in one place. */
export const pageMeta = (path: string, title: string, description: string) => ({
  title, description, alternates: { canonical: path }, openGraph: og(path, `${title} · ${LEGAL.product}`, description),
});

const PRIVATE = ["/api/", "/f/", "/oh/", "/p/", "/tc/", "/u/", "/invite", "/agency-invite", "/accept", "/mfa", "/oauth/", "/auth/"];
/** What a crawler needs besides the pages to render them: scripts, styles, images, icons, share cards, AI files. */
const ASSETS = ["/login", "/llms.txt", "/llms-full.txt", "/site/", "/_next/", "/opengraph-image", "/twitter-image", "/apple-icon", "/favicon.ico", "/icons/", "/manifest.webmanifest"];
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "Bingbot", "DuckAssistBot", "MistralAI-User", "Amazonbot", "meta-externalagent", "CCBot"];

/**
 * robots.txt. Everything is disallowed except the public pages (taken from PUBLIC_PAGES, so a new page is never
 * blocked by accident) and the assets they need. Content-Signal (contentsignals.org) states the same intent for
 * crawlers that read it: search, AI answers and AI training are all welcome on these pages.
 */
export function robotsTxt() {
  const top = [...new Set(PUBLIC_PAGES.map((p) => "/" + p.path.split("/")[1]))];
  const group = (agents: string[]) => [
    ...agents.map((a) => `User-agent: ${a}`),
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
    "Allow: /$",
    ...[...top, ...ASSETS].map((p) => `Allow: ${p}`),
    "Disallow: /",
    ...PRIVATE.map((p) => `Disallow: ${p}`),
  ].join("\n");
  return `${group(["*"])}\n\n${group(AI_BOTS)}\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

/** llms.txt (llmstxt.org): what Estos is, in Markdown, with links to the pages that say more. */
export function llmsTxt(full: boolean) {
  const plans = PLANS.map((p) => `- [${p.name}](${SITE}/pricing#${p.key}): $${p.monthly} per agent per month, or ${YEARLY_MONTHS} months' price for a year. ${p.pitch}${full ? `\n${p.includes.map((i) => `  - ${i}`).join("\n")}` : ""}`).join("\n");
  const store = STORE.map((s) => `- [${s.name}](${SITE}/store/${s.key}): ${s.why} Starts when ${s.when.toLowerCase()}; ${s.taskCount} task${s.taskCount === 1 ? "" : "s"} over ${s.span}.`).join("\n");
  return `# ${LEGAL.product}

> ${SUMMARY}

${LEGAL.product} is web software at ${SITE}, installable on phones. ${DISAMBIGUATION} Assistants are free; owners, admins and agents are billed per seat.${BILLING_LIVE ? "" : " It is free during early access while billing is finished; the prices below are the launch prices."} All prices are in US dollars, plus sales tax where it applies, with a ${TRIAL_DAYS}-day free trial, no setup fees and no contracts.

Features:
${FEATURES.map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Not available yet:
${NOT_YET.map((x) => `- ${x}`).join("\n")}

Last updated: ${COPY_UPDATED}

## Pricing

${plans}

## Questions

${FAQ.map((f) => `- **${f.q}** ${faqText(f)}${f.link ? ` (${SITE}${f.link.href})` : ""}`).join("\n")}

## Pages

- [Home](${SITE}/welcome): product tour
- [Pricing](${SITE}/pricing): plans, early access and FAQ
- [Playbook store](${SITE}/store): ready-made follow-up sequences, free on every plan
${TOPICS.map(([p, t, d]) => `- [${t}](${SITE}${p}): ${d}`).join("\n")}
${LEGAL_PAGES.map(([t, p]) => `- [${t}](${SITE}${p})`).join("\n")}
${full ? `\n## Playbooks\n\n${store}\n` : `\n## Optional\n\n- [Full version of this file](${SITE}/llms-full.txt): every plan feature and every playbook\n- [Playbook store](${SITE}/store): every playbook with its steps\n`}
## Contact

- [Support](mailto:${LEGAL.support})
- [Privacy](mailto:${LEGAL.privacy})
`;
}
