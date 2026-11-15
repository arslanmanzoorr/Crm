import type { Metadata } from "next";
import { TopicPage, type Topic } from "@/components/site/topic-page";
import { PLANS, YEARLY_MONTHS } from "@/lib/plans";
import { og } from "@/lib/seo";

const team = PLANS.find((p) => p.key === "team")!.monthly;
const agents = 6, assistants = 2;

const T: Topic = {
  path: "/teams",
  name: "Estos for teams",
  title: "Real estate CRM for teams: lead routing, splits and accountability · Estos",
  description: `Estos for real estate teams and brokerages: automatic lead routing, a first-reply watchdog, commission splits, caps and tiers, offices and your own brand. Team plan $${team} per agent; assistants free.`,
  eyebrow: "For teams and brokerages",
  h1: "The real estate CRM for teams that route every lead.",
  intro: `Estos gives a real estate team one shared CRM. New leads go to the right agent automatically, everyone can see who is still waiting for a first reply, and commission splits, caps and tiers are worked out on every deal. The Team plan is $${team} per agent per month, and assistants are free.`,
  sections: [
    {
      h: "Lead routing",
      body: ["Leads from web forms, open-house sign-in, website chat, CSV import and the API are assigned the moment they arrive."],
      list: [
        "Territories first: a lead in an agent's area goes to that agent.",
        "Then round robin, or by performance, weighted by each agent's contact rate over the last 90 days.",
        "Agents can step out of the rotation, and owners can reassign any lead or many at once.",
      ],
    },
    {
      h: "Nobody waits for a first reply",
      body: ["New leads that haven't heard back sit at the top of the agent's Today list with a live timer. The agent gets an alert at 5, 15 and 60 minutes, and owners are alerted at 60 minutes for any lead on the team. Response times are tracked per agent."],
    },
    {
      h: "Roles that match how teams work",
      body: ["Owners and admins run settings, billing and routing. Agents work their leads and deals. Assistants help everyone and are free, so you never pay a seat for help."],
    },
    {
      h: "Commission splits, caps and tiers",
      body: ["Set a default split per agent, an annual cap with the blended split worked out on the deal that crosses it, and team tiers by year-to-date gross commission. Each deal shows the agent's share, the brokerage's share and any referral fee, and payouts move from pending to approved to paid."],
    },
    {
      h: "The whole team's pipeline",
      body: ["Owners see every deal with volume and gross commission by agent, what closes in the next 30 days, and conversion by agent. Offices get their own time zone, analytics and pipeline."],
    },
    {
      h: "Your brand, not ours",
      body: ["On the Team plan, owners set the logo, colours and button style across the CRM, put client pages such as forms, open-house sign-in and portals on the team's own web address, and remove “Powered by Estos”."],
    },
    {
      h: "What a team pays",
      body: [
        `A team of ${agents} agents and ${assistants} assistants on the Team plan pays ${agents} × $${team} = $${agents * team} a month, because assistants are free. Paid yearly, it's $${agents * team * YEARLY_MONTHS} a year: ${YEARLY_MONTHS} months' price for 12.`,
        "No setup fees and no contracts. Estos is free during early access, and the prices above are the launch prices.",
      ],
    },
  ],
  faq: [
    { q: "Do assistants need a paid seat?", a: "No. Owners, admins and agents are billed per seat; assistants are free." },
    { q: "Can every agent see every lead?", a: "Everyone on a team works from the team's shared lead list, and filters show each agent their own. Data never leaves the team: other teams can't see it." },
    { q: "Can we bring our leads from another CRM?", a: "Yes. Upload a CSV from any CRM or spreadsheet. Duplicates are matched by email or phone, and consent stays off unless you confirm you hold it." },
    { q: "We run several teams for clients. Does Estos support that?", a: "Yes. Agency mode on the Team plan lets one agency run sub-accounts for client teams, each with its own data, from snapshots of your settings, automations and templates." },
  ],
  related: [["TCPA and Do Not Call checks", "/tcpa-compliant-crm"], ["AI that drafts, you send", "/ai"], ["Security and data privacy", "/security"], ["Pricing", "/pricing"]],
};

export const metadata: Metadata = { title: { absolute: T.title }, description: T.description, alternates: { canonical: T.path }, openGraph: og(T.path, T.title, T.description) };

export default function Page() {
  return <TopicPage t={T} />;
}
