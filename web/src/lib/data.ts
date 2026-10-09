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
  email: string;
  phone: string;
  budget: string;
  areas: string[];
  preferences: string[];
  activity: { when: string; channel: Channel; text: string; inbound?: boolean }[]; // when: ISO timestamp, or a label in mock data
  type?: string;
  stage?: Stage;
  nextAction?: string;
  consent?: { sms: boolean; call: boolean; email: boolean; dnc: boolean };
  ownerId?: string | null;
  tags?: string[];
  createdAt?: string;
  firstResponseAt?: string | null;
};

export const STAGES = ["New", "Contacted", "Qualified", "Showing", "Offer", "Under Contract", "Closed", "Lost"] as const;
export type Stage = (typeof STAGES)[number];

export type Channel = "Call" | "SMS" | "WhatsApp" | "Email" | "Instagram" | "Note";

export type Property = {
  id: string;
  address: string;
  area: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  status: "Active" | "Coming soon" | "Under contract" | "Sold";
  features: string[];
  description: string;
  showingNotes?: string; // lockbox, notice, pets (team only)
  sellerId?: string | null; // the seller client (their portal shows this listing)
  createdAt?: string;
  listingExpires?: string | null; // listing agreement end date
  tourUrl?: string | null;
  estRent?: number | null; // estimated monthly rent (investors)
  floorPlanUrl?: string | null;
  approved?: boolean; // agents' new listings wait for an owner/admin
  tone: string; // placeholder cover gradient when a listing has no photos
  cover?: string; // signed URL of the first photo
  photos?: { id: string; url: string }[]; // full gallery (listing page only)
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
  dueAt?: string; // ISO; real tasks only
  contactId?: string;
  phone?: string;
  email?: string;
  done?: boolean;
};

export type ScheduleItem = { id: string; time: string; label: string; people: string[]; minutes: number };

export const agent = { name: "Arslan Manzoor", initials: "AM" };



export const leads: Lead[] = [
  {
    id: "l1",
    name: "Jane Doe",
    headline: "Buyer · 3-bed, Westside · ≤ $650k",
    sources: ["Zillow", "Instagram"],
    score: 92,
    intent: "Buying in 0–3 months · pre-approved",
    lastTouch: "Viewed 14 Oak Ave 4× today",
    email: "jane@example.com",
    phone: "+15550100001",
    budget: "$600k–$650k",
    areas: ["Westside", "Oak Park"],
    preferences: ["3 bed", "Big backyard", "Quiet street"],
    activity: [{ when: "Today 09:12", channel: "Note", text: "Viewed 14 Oak Ave 4× on the website" }, { when: "Yesterday", channel: "SMS", text: "“Can we see Oak Ave this weekend?”" }, { when: "Mon", channel: "Call", text: "12 min. Pre-approved $640k, wants to move before school starts." }],
  },
  {
    id: "l2",
    name: "Darlene Robertson",
    headline: "Seller · Condo, Downtown",
    sources: ["Website"],
    score: 74,
    intent: "Listing in ~60 days",
    lastTouch: "Requested a CMA",
    email: "darlene@example.com",
    phone: "+15550100002",
    budget: "List ~$425k",
    areas: ["Downtown"],
    preferences: ["Sell within 60 days", "Relocating"],
    activity: [{ when: "Today 08:40", channel: "Email", text: "Requested a CMA for her condo" }, { when: "Last week", channel: "Call", text: "Relocating for work in January." }],
  },
  {
    id: "l3",
    name: "Wade Warren",
    headline: "Investor · Duplexes · cash",
    sources: ["Facebook Ads"],
    score: 58,
    intent: "Comparing cap rates",
    lastTouch: "Opened 3 listing emails",
    email: "wade@example.com",
    phone: "+15550100003",
    budget: "$400k–$900k cash",
    areas: ["Eastside", "Riverside"],
    preferences: ["Duplex/triplex", "Cap rate > 6%"],
    activity: [{ when: "Yesterday", channel: "Email", text: "Opened 3 listing emails" }, { when: "Sep 28", channel: "Note", text: "Came from FB lead ad: “Investor deals”." }],
  },
  {
    id: "l4",
    name: "Jonah Jude",
    headline: "Renter → first-time buyer",
    sources: ["Open House", "Referral"],
    score: 41,
    intent: "Browsing · 6+ months",
    lastTouch: "Signed in at open house",
    email: "jonah@example.com",
    phone: "+15550100004",
    budget: "≤ $350k",
    areas: ["Northside"],
    preferences: ["First home", "Near transit"],
    activity: [{ when: "Sat", channel: "Note", text: "Signed in at Westside open house" }],
  },
  {
    id: "l5",
    name: "Mia Chen",
    headline: "Buyer · Townhouse · ≤ $480k",
    sources: ["Instagram"],
    score: 83,
    intent: "Buying in 1–2 months",
    lastTouch: "DM'd “still available?” on Reel",
    email: "mia@example.com",
    phone: "+15550100005",
    budget: "≤ $480k",
    areas: ["Midtown"],
    preferences: ["Townhouse", "Garage"],
    activity: [{ when: "Today 07:55", channel: "Instagram", text: "DM on Reel: “still available?”" }, { when: "Today 07:56", channel: "Instagram", text: "AI auto-reply sent with 3 matches" }],
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


export const properties: Property[] = [
  { id: "p1", address: "14 Oak Ave", area: "Westside", price: 635000, beds: 3, baths: 2, sqft: 1840, status: "Active", features: ["Backyard", "Renovated kitchen", "2-car garage"], description: "Bright 3-bed on a quiet tree-lined street with a deep backyard and a fully renovated kitchen.", tone: "from-[#c5f36a] to-[#3a5a1a]" },
  { id: "p2", address: "22 Pine St", area: "Oak Park", price: 612000, beds: 3, baths: 2.5, sqft: 1990, status: "Under contract", features: ["Home office", "Solar", "Walk to school"], description: "Turn-key family home with solar, a home office and a 5-minute walk to the elementary school.", tone: "from-[#9fd3f5] to-[#1d3a52]" },
  { id: "p3", address: "880 Harbor Blvd #12", area: "Downtown", price: 429000, beds: 2, baths: 2, sqft: 1100, status: "Coming soon", features: ["City views", "Gym", "Concierge"], description: "Corner 2-bed condo with skyline views, a doorman building and a gym downstairs.", tone: "from-[#f5d35d] to-[#5a4510]" },
  { id: "p4", address: "5 Elm Ct", area: "Midtown", price: 469000, beds: 3, baths: 2.5, sqft: 1600, status: "Active", features: ["Townhouse", "Garage", "Patio"], description: "End-unit townhouse with an attached garage, private patio and an open-plan main floor.", tone: "from-[#d4b5f5] to-[#3d2a55]" },
  { id: "p5", address: "301 River Rd", area: "Riverside", price: 780000, beds: 6, baths: 4, sqft: 3200, status: "Active", features: ["Duplex", "Separate meters", "7.1% cap rate"], description: "Up-and-down duplex, both units leased, separate meters and a 7.1% cap rate at asking.", tone: "from-[#f5a25d] to-[#5a2e10]" },
];

export type Message = { from: "lead" | "agent"; text: string; at: string };
export type Thread = { leadId: string; name: string; phone: string; email: string; channel: Channel; messages: Message[]; lead?: Pick<Lead, "intent" | "budget" | "preferences"> };

const threadsSeed: Omit<Thread, "name" | "phone" | "email">[] = [
  { leadId: "l1", channel: "SMS", messages: [
    { from: "agent", text: "Hi Jane, 14 Oak Ave just had a price adjustment to $635k.", at: "Yesterday 10:02" },
    { from: "lead", text: "Can we see Oak Ave this weekend? Saturday morning works best.", at: "Yesterday 18:40" },
  ] },
  { leadId: "l5", channel: "Instagram", messages: [
    { from: "lead", text: "still available?", at: "07:55" },
    { from: "agent", text: "Yes! 5 Elm Ct is available. Want me to send 2 similar townhouses too?", at: "07:56" },
    { from: "lead", text: "yes please, and does it have a garage", at: "08:10" },
  ] },
  { leadId: "l2", channel: "Email", messages: [
    { from: "lead", text: "Hi, could you send me a market analysis for my condo at 880 Harbor Blvd? Thinking of listing in about two months.", at: "08:40" },
  ] },
  { leadId: "l3", channel: "WhatsApp", messages: [
    { from: "lead", text: "Any duplexes over 6% cap in Riverside?", at: "Mon 21:14" },
  ] },
];

export const mockThreads: Thread[] = threadsSeed.map((t) => {
  const l = leads.find((x) => x.id === t.leadId)!;
  return { ...t, name: l.name, phone: l.phone, email: l.email, lead: l };
});

export const leadById = (id: string) => leads.find((l) => l.id === id);
export const propertyById = (id: string) => properties.find((p) => p.id === id);
export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
/** Dollars and cents when there are cents: commission parts must add up to the gross on screen. */
export const cash = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
