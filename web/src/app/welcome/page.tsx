import { ArrowRight, Check, FileLock2, Lock, PhoneOff, Scale, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlaybookPreview } from "@/components/site/playbook-preview";
import { CircleReveal, CtaTicker, Letters, LiftCard, Panels, Reveal, SiteFooter, SiteNav, type Panel } from "@/components/site/signal";
import { btnGhost, btnPrimary, S } from "@/lib/site-theme";
import { siteFont } from "@/lib/site-font";
import { STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: { absolute: "Estos: the real estate CRM that writes the follow-up for you" },
  description: "Leads, listings, deals and follow-up in one place, with AI that drafts the work and you approve it.",
};

const PANELS: Panel[] = [
  { k: "Leads", h: "Every lead scored, with the reason.", b: "Forms, open houses, website chat and the API land in one list, routed to the right agent.", img: "/site/s-leads.png", w: 2360, hh: 1520 },
  { k: "Today", h: "The calls that matter, in order.", b: "Hottest and most overdue first. AI writes the opener; you decide what goes out.", img: "/site/s-today.png", w: 2360, hh: 1280 },
  { k: "Clients", h: "One page per person.", b: "Score, timeline, financing, showings and documents, together.", img: "/site/s-lead.png", w: 2360, hh: 1400 },
  { k: "Money", h: "Your share, month by month.", b: "Splits, caps and tiers handled, plus what closes next month.", img: "/site/s-revenue.png", w: 2220, hh: 762 },
];

export default function WelcomePage() {
  return (
    <div data-site className={`${siteFont.className} min-h-[100dvh] overflow-x-clip`} style={{ background: S.bg, color: S.ink }}>
      <SiteNav />

      <section className="mx-auto max-w-[1240px] px-5 pt-14 sm:px-8 sm:pt-24">
        <h1 className="text-[clamp(3.4rem,10vw,9.5rem)] leading-[0.9] font-extrabold tracking-[-0.05em]">
          <Letters text="Sell more." /><br /><span style={{ color: S.accentDisplay }}><Letters text="Type less." delay={0.3} /></span>
        </h1>
        <div className="mt-10 grid gap-8 border-t border-black/15 pt-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <p className="max-w-[44ch] text-xl" style={{ color: S.muted }}>The real estate CRM that writes the follow-up for you to approve, and keeps every deal on track.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={btnPrimary}>Create account <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
            <Link href="/store" className={btnGhost}>Browse the store</Link>
          </div>
        </div>
      </section>

      <CircleReveal src="/site/s-leads.png" alt="The Estos leads board: each lead with its AI score, next step and source." w={2360} h={1520} />

      <section id="product" className="scroll-mt-20 pb-28">
        <Reveal className="mx-auto mb-10 max-w-[1240px] px-5 sm:px-8">
          <h2 className="text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl">Pick a screen.</h2>
        </Reveal>
        <Panels items={PANELS} />
      </section>

      <section id="trust" className="scroll-mt-20 border-t border-black/10 py-28">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <Reveal>
            <p className="text-sm font-semibold tracking-[0.16em] uppercase" style={{ color: S.accentText }}>Built to be trusted</p>
            <h2 className="mt-3 max-w-[16ch] text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl">Guardrails come switched on.</h2>
          </Reveal>
          <div className="mt-12 grid gap-3 md:grid-cols-6">
            <Reveal className="md:col-span-4 md:row-span-2">
              <div className="h-full rounded-[8px] bg-[#111111] p-8 text-white sm:p-10">
                <Sparkles aria-hidden className="size-7" style={{ color: S.accent }} />
                <h3 className="mt-6 max-w-[16ch] text-3xl font-bold tracking-tight sm:text-4xl">AI drafts. You decide what gets sent.</h3>
                <p className="mt-4 max-w-[46ch] text-white/70">Replies, call openers, listing copy and daily plans come with their reasons. Nothing reaches a client until a person sends it.</p>
                <ul className="mt-8 grid gap-2.5 text-sm text-white/85 sm:grid-cols-2">
                  {["Replies in the language the lead writes in", "Suggests only homes from your own listings", "Profile updates quote the lead's own words", "Every AI call is logged and capped"].map((t) => (
                    <li key={t} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0" style={{ color: S.accent }} />{t}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.06} className="md:col-span-2">
              <div className="h-full rounded-[8px] p-7" style={{ background: S.accent, color: S.ink }}>
                <Scale aria-hidden className="size-6" />
                <h3 className="mt-5 text-xl font-bold">Fair Housing checks</h3>
                <p className="mt-2 text-sm">Listing copy and AI answers describe the home, never who should live there.</p>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="md:col-span-2">
              <div className="h-full rounded-[8px] bg-white p-7 ring-1 ring-black/10">
                <PhoneOff aria-hidden className="size-6" style={{ color: S.accentText }} />
                <h3 className="mt-5 text-xl font-bold">Consent before contact</h3>
                <p className="mt-2 text-sm" style={{ color: S.muted }}>Calls and texts wait for consent, the Do Not Call check and your calling hours.</p>
              </div>
            </Reveal>
            <Reveal delay={0.04} className="md:col-span-3">
              <div className="flex h-full items-start gap-5 rounded-[8px] p-7" style={{ background: S.panel }}>
                <Lock aria-hidden className="size-6 shrink-0" style={{ color: S.accentText }} />
                <div><h3 className="text-xl font-bold">Your team&apos;s data stays your team&apos;s</h3><p className="mt-2 text-sm" style={{ color: S.muted }}>Every record is locked to your team in the database, with two-step sign-in for anyone who turns it on.</p></div>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="md:col-span-3">
              <div className="flex h-full items-start gap-5 rounded-[8px] bg-white p-7 ring-1 ring-black/10">
                <FileLock2 aria-hidden className="size-6 shrink-0" style={{ color: S.accentText }} />
                <div><h3 className="text-xl font-bold">Private links, not shared logins</h3><p className="mt-2 text-sm" style={{ color: S.muted }}>Clients and coordinators get their own private page for one journey. Turn a link off any time.</p></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 py-28" style={{ background: S.panel }}>
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <Reveal>
            <h2 className="max-w-[18ch] text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl">Follow-up that runs itself.</h2>
            <p className="mt-4 max-w-[52ch] text-lg" style={{ color: S.muted }}>Switch on a playbook and the right tasks show up on the right day. Free, and yours to edit.</p>
          </Reveal>
          <div className="mt-12 grid gap-3 md:grid-cols-3">
            {STORE.slice(0, 3).map((item, i) => (
              <Reveal key={item.key} delay={i * 0.06}>
                <LiftCard href={`/store/${item.key}`} className="gap-6">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: S.accentText }}>{item.category}</p>
                    <h3 className="mt-2 text-xl font-bold leading-snug">{item.name}</h3>
                  </div>
                  <PlaybookPreview item={item} />
                  <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold">See playbook <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
                </LiftCard>
              </Reveal>
            ))}
          </div>
          <Link href="/store" className={`${btnGhost} mt-10`}>Browse the store</Link>
        </div>
      </section>

      <CtaTicker />
      <SiteFooter />
    </div>
  );
}
