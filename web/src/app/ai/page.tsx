import type { Metadata } from "next";
import { TopicPage, type Topic } from "@/components/site/topic-page";
import { PLANS } from "@/lib/plans";
import { og } from "@/lib/seo";

const pro = PLANS.find((p) => p.key === "pro")!.monthly;

const T: Topic = {
  path: "/ai",
  name: "AI follow-up",
  title: "Real estate CRM with AI follow-up you approve · Estos",
  description: "Estos AI drafts replies, call openers and next steps for every real estate lead, explains every score, reads contracts and checks Fair Housing wording. A person sends every message.",
  eyebrow: "AI in Estos",
  h1: "AI that drafts your follow-up. You decide what gets sent.",
  intro: `Estos is a real estate CRM whose AI drafts replies, call openers and next steps for every lead and leaves sending to a person. It writes in the language the lead wrote in, suggests only homes from your own listings, shows the reason behind every score, and marks its drafts as AI-written. AI features are on the Pro plan ($${pro} per agent per month) and up.`,
  sections: [
    {
      h: "What the AI drafts",
      body: ["Drafts appear where you work, and nothing goes out until you send it."],
      list: [
        "Replies in the inbox, in the lead's own language, suggesting only homes from your listings that fit them.",
        "Call openers and email drafts for the next task on a lead.",
        "Follow-ups after a showing, based on what the buyer said.",
        "Listing descriptions from the listing's facts, checked for Fair Housing wording.",
        "Social posts, short video scripts and monthly market notes from your own listings and sales.",
      ],
    },
    {
      h: "Scores that show their reason",
      body: ["Analyze with AI reads a lead's timeline and gives a score from 0 to 100, the reason in a sentence, and a next step that lands on your task list. A score you can't explain is a score you can't act on."],
    },
    {
      h: "Ask in plain English",
      body: ["Type “buyers in Westside nobody's called in 30 days” and the lead list filters itself. Ask your business questions such as “which sources closed the most last quarter” and get answers from your own numbers."],
    },
    {
      h: "Contract reader",
      body: ["Upload a purchase agreement and the AI proposes the acceptance date, closing date, price and every deadline, each quoted from the contract's own words. You check and edit each one, then the deal's milestones update."],
    },
    {
      h: "Quick update after a call",
      body: ["Say or type what happened (“Called Maya, loved Oak Ave, wants a showing Saturday at 10”) and Estos proposes the logged call, the note, the showing and the follow-up task. You confirm before anything is saved, and nothing is sent to the client."],
    },
    {
      h: "The website chat assistant",
      body: ["The one place AI talks to people directly. It answers questions about your public listings, never collects contact details, tells visitors its answers are automated, and can open the booking form for a listed home. Your team can take over any chat, or switch the assistant off."],
    },
    {
      h: "Guardrails",
      list: [
        "AI requests go through OpenRouter with data collection off, so they only reach providers that don't store or train on your data.",
        "Every AI request is logged on Account (who, what, when), with a daily limit per team.",
        "AI drafts are labelled as AI-written, and tasks the AI creates are marked AI.",
        "Calls and texts still wait for consent, the Do Not Call check and your calling hours.",
      ],
      body: [],
    },
    {
      h: "Bring your own AI assistant",
      body: ["Connect Claude, ChatGPT or Cursor to Estos. They can plan your day, find a buyer the right home or log a call, with exactly your own access, and they never send messages on their own."],
    },
  ],
  faq: [
    { q: "Does the AI send messages to my clients by itself?", a: "No. A person sends every message. The website chat assistant is the only exception, and it says its answers are automated." },
    { q: "Will the AI make up listings?", a: "No. Reply drafts and suggestions only use homes from your own listings." },
    { q: "Is my data used to train AI models?", a: "No. Requests go through OpenRouter with data collection switched off, so they only reach model providers that don't store or train on them." },
    { q: "Which plan includes AI?", a: `Pro ($${pro} per agent per month) and Team. Starter has everything else: leads, pipeline, listings, deals, playbooks and the client portal.` },
  ],
  related: [["TCPA and Do Not Call checks", "/tcpa-compliant-crm"], ["Estos for teams", "/teams"], ["Security and data privacy", "/security"], ["Free follow-up playbooks", "/store"]],
};

export const metadata: Metadata = { title: { absolute: T.title }, description: T.description, alternates: { canonical: T.path }, openGraph: og(T.path, T.title, T.description) };

export default function Page() {
  return <TopicPage t={T} />;
}
