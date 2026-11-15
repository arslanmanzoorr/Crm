import type { Metadata } from "next";
import Link from "next/link";
import { TopicPage, type Topic } from "@/components/site/topic-page";
import { LEGAL } from "@/lib/legal";
import { og } from "@/lib/seo";

const T: Topic = {
  path: "/security",
  name: "Security",
  title: "Security and data privacy · Estos real estate CRM",
  description: "How Estos protects your team's data: team isolation in the database, two-step sign-in, encryption, private client links, AI without data retention, and where your data lives.",
  eyebrow: "Security",
  h1: "How Estos keeps your clients' data safe.",
  intro: "Every record in Estos belongs to one team and is locked to that team inside the database. Sign-in can require a second step, client pages use private links you can turn off, and AI requests only go to providers that neither store nor train on your data. Here is how each part works.",
  sections: [
    {
      h: "Your team's data stays your team's",
      body: ["Every table is protected by row-level security in the database: a person only ever reaches records of the team they're working in, whatever the app asks for. Agency staff who manage a client team see that team only while they're in it."],
    },
    {
      h: "Sign-in",
      body: ["Anyone can turn on two-step sign-in with an authenticator app. It's enforced by the database, not just the screen: until the code is entered, an enrolled user gets no team data at all."],
    },
    {
      h: "Encryption",
      body: ["Every connection uses HTTPS, and browsers are told to never connect without it. Data is encrypted at rest by our database provider, and the tokens for a connected Google account are encrypted again with a key only the app holds."],
    },
    {
      h: "Private links, not shared logins",
      body: ["Clients and transaction coordinators get their own private page for one journey instead of a password. The links are long and random, are kept out of search engines and referrer headers, and can be turned off at any time."],
    },
    {
      h: "AI without data retention",
      body: ["AI requests go through OpenRouter with data collection switched off, so they only reach model providers that don't store prompts or train on them. Every AI request is logged on Account, and AI never sends a message to a client on its own."],
    },
    {
      h: "Keys and connections",
      body: ["API keys and AI-assistant tokens are shown once and stored only as a hash. They're rate-limited and can be revoked in one click. Assistant tokens can also be read-only and expire, and a connected AI assistant acts with exactly the access of the person who connected it."],
    },
    {
      h: "No trackers in your browser",
      body: ["Estos uses only the cookies needed to sign you in and keep you secure: no advertising or analytics trackers. Pages run under a strict content security policy that blocks scripts from anywhere else."],
    },
    {
      h: "Where your data lives",
      body: [<>The database, sign-in and file storage run on Supabase in Frankfurt, Germany. The app is hosted on Vercel in the United States. Email sending, AI routing and the optional Google connection each have one listed provider. The full list, with what each one handles, is on our <Link key="s" href="/legal/subprocessors" className="underline">subprocessors page</Link>.</>],
    },
    {
      h: "Your data, your call",
      body: [<>Owners and admins can download everything as one file at any time: every table, the full history and, optionally, documents and photos. Each export is logged. Deleting a lead removes their files with them, and people in your CRM can send privacy requests through a public form. See the <Link key="p" href="/legal/privacy" className="underline">privacy policy</Link> and the <Link key="d" href="/legal/dpa" className="underline">Data Processing Addendum</Link>.</>],
    },
    {
      h: "Reporting a security issue",
      body: [<>Found something? Email <a href={`mailto:${LEGAL.support}?subject=Security`} className="underline">{LEGAL.support}</a> with &ldquo;Security&rdquo; in the subject. We read every report and reply.</>],
    },
  ],
  related: [["TCPA and Do Not Call checks", "/tcpa-compliant-crm"], ["AI that drafts, you send", "/ai"], ["Estos for teams", "/teams"], ["Subprocessors", "/legal/subprocessors"]],
};

export const metadata: Metadata = { title: { absolute: T.title }, description: T.description, alternates: { canonical: T.path }, openGraph: og(T.path, T.title, T.description) };

export default function Page() {
  return <TopicPage t={T} />;
}
