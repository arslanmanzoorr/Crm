import type { Metadata } from "next";
import Link from "next/link";
import { TopicPage, type Topic } from "@/components/site/topic-page";
import { og } from "@/lib/seo";

const T: Topic = {
  path: "/tcpa-compliant-crm",
  name: "TCPA and Do Not Call",
  title: "TCPA-compliant real estate CRM: consent and Do Not Call checks · Estos",
  description: "How Estos checks consent, the National Do Not Call Registry and calling hours before an agent can call or text a lead, and what it can't do for you.",
  eyebrow: "Compliance",
  h1: "A real estate CRM that checks consent and Do Not Call before you dial.",
  intro: "Estos is a real estate CRM that checks the rules before an agent can call or text a lead. Texts need the lead's recorded consent. Calls need consent, or a National Do Not Call Registry check recorded in the last 31 days. Call and text buttons only work inside your team's calling hours, which can never be wider than the federal 8am to 9pm. Estos is software, not legal advice.",
  reviewed: true,
  sections: [
    {
      h: "What Estos checks before a call",
      body: ["Every lead carries its own consent record. Before the call button works, Estos checks it in this order, and when a check fails the button stays off and says why."],
      list: [
        "Do not contact: if the lead asked to stop or is on your do-not-contact list, there is no call, text or marketing email at all.",
        "Consent to call: recorded when the person ticks the box on your web form, open-house sign-in or booking page, or when an agent records it.",
        "Without consent, a cold call is allowed only to a number checked against the National Do Not Call Registry within the last 31 days. The agent checks the number and records the result in Estos; a listed number becomes do not contact.",
        "Calling hours: the team's window, in the office's or team's time zone, never earlier than 8am or later than 9pm.",
      ],
    },
    {
      h: "What Estos checks before a text",
      body: [
        "Texts need the lead's consent to be texted. A Do Not Call Registry check does not unlock texting: under the TCPA, marketing texts to a cell phone need the person's prior express consent.",
        "Texts also wait for your calling hours, and a do-not-contact flag stops them completely.",
      ],
    },
    {
      h: "Email follows its own rules",
      body: ["Newsletters and drip emails only go to leads who agreed to email. Every message has a one-click unsubscribe and your postal address, and bounces and spam complaints stop future sends automatically."],
    },
    {
      h: "Consent is never assumed",
      body: ["Forms record consent only when the person ticks the box. Imported leads start with calling, texting and emailing switched off unless you confirm you hold their consent. The AI never records consent, and Estos's AI assistant connection can't change it either."],
    },
    {
      h: "Recording calls in all-party consent states",
      body: ["Some states require everyone on a call to agree before it is recorded. Owners can switch on a reminder that appears next to the call button, so agents ask first."],
    },
    {
      h: "Requests to stop, see or delete data",
      body: ["Each team has a do-not-contact list and a public privacy-request form. Requests to see, correct or delete personal data are tracked against a 45-day deadline, and deleting a lead removes their files with them."],
    },
    {
      h: "Fair Housing checks on listing copy",
      body: ["Listing descriptions, posts and AI drafts describe the home, never who should live there. A built-in Fair Housing check flags phrases such as “perfect for young couples”, “no Section 8” or “Christian neighborhood” with the reason and a suggested rewrite."],
    },
    {
      h: "What Estos does not do",
      body: ["No software makes an agent compliant on its own, and these limits matter:"],
      list: [
        "Estos does not query the Do Not Call Registry itself; the agent checks the number and records the result.",
        "Estos has no built-in dialer or texting: calls and texts go from the agent's own phone, and Estos gates the buttons and logs what happened.",
        "State rules (for example Florida's and Oklahoma's telemarketing laws) can be stricter than federal rules. Check with your broker or a lawyer.",
      ],
    },
  ],
  faq: [
    { q: "Is Estos TCPA compliant?", a: "No software can make you compliant on its own. Estos enforces the checks the TCPA and the Telemarketing Sales Rule are built around (consent, a Do Not Call scrub within 31 days, calling hours, stopping when asked) and records them on each lead, so the safe choice is the default one." },
    { q: "Does Estos check the National Do Not Call Registry automatically?", a: "No. The agent checks the number at the registry and records the result in Estos. A recorded check unlocks cold calls for 31 days; a listed number becomes do not contact." },
    { q: "Can I text a lead who filled out my web form?", a: "Only if they ticked the box agreeing to be texted. A form submission alone is not consent to text." },
    { q: "What happens when a lead says stop?", a: "Mark them do not contact and every call, text and marketing email to them is blocked. Email unsubscribes do this for email automatically." },
    { q: "What are the penalties for getting it wrong?", a: "Under the TCPA, a person can sue for $500 per violating call or text, up to $1,500 if it was willful or knowing (47 U.S.C. 227). Each call or text can count separately." },
  ],
  footnote: <>Rules referenced: the Telephone Consumer Protection Act (47 U.S.C. 227) and FCC rules at 47 CFR 64.1200; the FTC Telemarketing Sales Rule&apos;s 31-day registry scrub (16 CFR 310.4(b)(3)(iv)). This page explains how Estos works; it is not legal advice. See also our <Link href="/legal/privacy" className="underline">privacy policy</Link>.</>,
  related: [["Security and data privacy", "/security"], ["AI that drafts, you send", "/ai"], ["Estos for teams", "/teams"], ["Pricing", "/pricing"]],
};

export const metadata: Metadata = { title: { absolute: T.title }, description: T.description, alternates: { canonical: T.path }, openGraph: og(T.path, T.title, T.description) };

export default function Page() {
  return <TopicPage t={T} />;
}
