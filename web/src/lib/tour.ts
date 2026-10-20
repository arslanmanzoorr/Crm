// First-run walkthrough: the steps, who sees which, and the getting-started quests. Plain module (no I/O).
import type { Feature } from "./features.ts";

export type Role = "owner" | "admin" | "agent" | "assistant";
export type TourStep = {
  id: string;
  path: string; // page the step lives on
  target: string; // CSS selector(s) of the thing to spotlight; comma = fallbacks, first visible one in this order wins
  title: string;
  body: string;
  needs?: Feature; // skipped when the team switched this module off
  roles?: Role[]; // only these roles (default: everyone)
};

export const STEPS: TourStep[] = [
  { id: "day", path: "/", target: "[data-tour=\"header\"]", title: "This is your day", body: "Everything that needs you today lands here first. The bar shows your schedule; the dot is now." },
  { id: "waiting", path: "/", target: "[data-tour=\"today\"]", title: "Who to call, in order", body: "Hottest and most overdue first. Tap Call and Estos logs it for you, so nobody slips through." },
  { id: "customize", path: "/", target: "[data-tour=\"customize\"]", title: "Make it yours", body: "Drag sections into your own order or hide what you don't need. Only you see your layout." },
  { id: "ask", path: "/leads", target: "[data-tour=\"ask\"]", title: "Ask in plain English", body: "Try \"buyers in Westside nobody's called in 30 days\". The dots on each card show how hot a lead is, with the reason." },
  { id: "lead", path: "/leads", target: "[data-tour=\"leads\"] > :first-child", title: "Open any lead", body: "AI suggests the next step and drafts the message. Nothing reaches a client until you send it." },
  { id: "inbox", path: "/inbox", target: "[data-tour=\"ai-draft\"], [data-tour=\"inbox\"]", title: "Replies, drafted for you", body: "Open a conversation and tap AI draft: it writes in the lead's own language and only suggests homes from your real listings.", needs: "inbox" },
  { id: "nav", path: "/", target: "[data-tour=\"nav\"]", title: "Everything else lives here", body: "Listings, showings, deals and clients are one tap away. On a phone, More holds the rest." },
  { id: "branding", path: "/team", target: "[data-tour=\"branding\"]", title: "Make it look like your team", body: "Your logo, color, button shape and light or dark theme, for everyone on the team.", roles: ["owner", "admin"] },
  { id: "modules", path: "/team", target: "[data-tour=\"modules\"]", title: "Only what you use", body: "Switch off modules your team doesn't need. Nothing is deleted.", roles: ["owner", "admin"] },
  { id: "search", path: "/", target: "[data-tour=\"search\"]", title: "Lost? Search", body: "Press ⌘K or / anywhere and type a name, an address or a page. That's the whole tour." },
];

/** The steps this person should see, in order. */
export function stepsFor(role: string | null | undefined, off: readonly string[]): TourStep[] {
  return STEPS.filter((s) => (!s.needs || !off.includes(s.needs)) && (!s.roles || s.roles.includes(role as Role)));
}

export type TourState = { status?: "done" | "skipped"; step?: string };
/** Only the shapes we write are ever read back. */
export function cleanTour(v: unknown): TourState {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    ...(o.status === "done" || o.status === "skipped" ? { status: o.status } : {}),
    ...(typeof o.step === "string" && STEPS.some((s) => s.id === o.step) ? { step: o.step } : {}),
  };
}

/** Getting-started quests. Each one ticks itself from real data; owners and admins get two more. */
export const QUESTS = [
  { id: "lead", title: "Add your first lead", href: "/leads/new" },
  { id: "touch", title: "Log a call, text or note", href: "/leads" },
  { id: "ai", title: "Ask AI to draft a reply", href: "/inbox" },
  { id: "listing", title: "Add a listing", href: "/properties/new", needs: "listings" },
  { id: "layout", title: "Arrange your Today page", href: "/" },
  { id: "mfa", title: "Turn on two-step sign-in", href: "/account" },
  { id: "invite", title: "Invite a teammate", href: "/team", roles: ["owner", "admin"] },
  { id: "brand", title: "Add your logo or color", href: "/team#branding", roles: ["owner", "admin"] },
] as const satisfies readonly { id: string; title: string; href: string; needs?: Feature; roles?: Role[] }[];
export type QuestId = (typeof QUESTS)[number]["id"];

export function questsFor(role: string | null | undefined, off: readonly string[]) {
  return QUESTS.filter((q) => {
    const x = q as { needs?: string; roles?: readonly string[] };
    return (!x.needs || !off.includes(x.needs)) && (!x.roles || x.roles.includes(role ?? ""));
  });
}
