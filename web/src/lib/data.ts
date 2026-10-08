// Mock data for the Workspace dashboard. Replace with Supabase queries.

export type LeadSource = "Zillow" | "Facebook Ads" | "Instagram" | "Website" | "Referral" | "Open House";

export type Lead = {
  id: string;
  name: string;
  headline: string;
  sources: LeadSource[];
  score: number; // 0–100, from the AI Analyst agent
  intent: string;
  lastTouch: string;
};

export type Task = {
  id: string;
  kind: "call" | "video" | "email" | "showing" | "cma";
  title: string;
  contact: string;
  contactRole: string;
  when: string;
  dueToday: boolean;
  priority: boolean; // AI's top recommended action
  note: string;
};

export type ScheduleItem = { id: string; time: string; label: string; people: string[]; minutes: number };

export const agent = { name: "Arslan Manzoor", initials: "AM" };

export const kpis = [
  { label: "Active deals", value: 34 },
  { label: "Showings this week", value: 20 },
  { label: "Hot leads", value: 9 },
  { label: "Lost", value: 3 },
];

export const schedule: ScheduleItem[] = [
  { id: "s1", time: "10:00", label: "Showing · 14 Oak Ave", people: ["Jane Doe"], minutes: 45 },
  { id: "s2", time: "12:30", label: "Call · Pre-approval", people: ["Wade Warren", "Lena Ortiz"], minutes: 20 },
  { id: "s3", time: "14:15", label: "Video call · Offer review", people: ["Robert Fox"], minutes: 36 },
  { id: "s4", time: "17:00", label: "Open house · Westside", people: ["Jonah Jude", "Mia Chen"], minutes: 120 },
];

export const leads: Lead[] = [
  {
    id: "l1",
    name: "Jane Doe",
    headline: "Buyer · 3-bed, Westside · ≤ $650k",
    sources: ["Zillow", "Instagram"],
    score: 92,
    intent: "Buying in 0–3 months · pre-approved",
    lastTouch: "Viewed 14 Oak Ave 4× today",
  },
  {
    id: "l2",
    name: "Darlene Robertson",
    headline: "Seller · Condo, Downtown",
    sources: ["Website"],
    score: 74,
    intent: "Listing in ~60 days",
    lastTouch: "Requested a CMA",
  },
  {
    id: "l3",
    name: "Wade Warren",
    headline: "Investor · Duplexes · cash",
    sources: ["Facebook Ads"],
    score: 58,
    intent: "Comparing cap rates",
    lastTouch: "Opened 3 listing emails",
  },
  {
    id: "l4",
    name: "Jonah Jude",
    headline: "Renter → first-time buyer",
    sources: ["Open House", "Referral"],
    score: 41,
    intent: "Browsing · 6+ months",
    lastTouch: "Signed in at open house",
  },
  {
    id: "l5",
    name: "Mia Chen",
    headline: "Buyer · Townhouse · ≤ $480k",
    sources: ["Instagram"],
    score: 83,
    intent: "Buying in 1–2 months",
    lastTouch: "DM'd “still available?” on Reel",
  },
];

export const tasks: Task[] = [
  {
    id: "t1",
    kind: "video",
    title: "Offer review call",
    contact: "Robert Fox",
    contactRole: "Buyer · 22 Pine St",
    when: "Today · 2:15 pm",
    dueToday: true,
    priority: true,
    note: "AI: seller countered at $612k. Suggest $598k with a 21-day close.",
  },
  {
    id: "t2",
    kind: "cma",
    title: "Send CMA",
    contact: "Darlene Robertson",
    contactRole: "Seller · Downtown condo",
    when: "Today · 4:00 pm",
    dueToday: true,
    priority: false,
    note: "Draft ready: 6 comps, range $410k–$435k.",
  },
  {
    id: "t3",
    kind: "call",
    title: "Follow-up call",
    contact: "Jane Doe",
    contactRole: "Buyer · Westside",
    when: "Today · 6:00 pm",
    dueToday: true,
    priority: false,
    note: "Prefers evening calls. Ask about the backyard size.",
  },
  {
    id: "t4",
    kind: "showing",
    title: "Book showing",
    contact: "Mia Chen",
    contactRole: "Buyer · Townhouse",
    when: "Tomorrow",
    dueToday: false,
    priority: false,
    note: "3 new matches found overnight.",
  },
];

export const callSummary = {
  contact: "Robert Fox",
  duration: "36 min",
  goal: "Close on 22 Pine St under $600k with a 21-day escrow before his lease ends on Nov 30.",
  keyPoints: [
    "Pre-approved up to $640k (doc on file)",
    "Wants inspection contingency kept",
    "Flexible on closing-cost credit",
  ],
  documents: ["Pre-approval", "Offer v2"],
  nextSteps: ["Send counter at $598k", "Book inspector for Mon"],
};
