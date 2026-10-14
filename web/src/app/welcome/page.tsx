import { ArrowRight, Check, FileLock2, Lock, PhoneOff, Scale, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeroVisual, Marquee, Reveal, ScrollStory, SiteNav, SpotlightCard, WordReveal } from "@/components/site/motion";
import { PlaybookPreview } from "@/components/site/playbook-preview";
import { SiteFooter } from "@/components/site/footer";
import { STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: { absolute: "EstateOS: the CRM real estate agents actually run their day from" },
  description: "Leads, listings, deals and follow-up in one place, with AI that drafts the work and you approve it.",
};

const CAPABILITIES = ["Lead routing", "AI lead scoring", "Showing booking", "Client portal", "CMAs", "Offers side by side", "Deal milestones", "Commission splits", "Farming", "Open house sign-in", "Zillow rentals feed", "Document templates", "Two-step sign-in", "Website chat"];

const STORY = [
  { title: "Catch every lead", body: "Web forms, open houses, your website chat and the API land in one list, routed to the right agent with a call task due in five minutes.", image: "/site/s-leads.png", alt: "Leads board with AI scores and next steps", w: 2360, h: 1520 },
  { title: "Know who to call first", body: "Today orders your calls by who is hottest and what is overdue. AI writes the opener; you decide what goes out.", image: "/site/s-today.png", alt: "Today view listing calls in priority order", w: 2360, h: 1280 },
  { title: "Work every client in one place", body: "Score, timeline, financing, showings and documents for each person, with the reason behind every AI suggestion.", image: "/site/s-lead.png", alt: "A lead's page with score, stage and next actions", w: 2360, h: 1400 },
  { title: "See what you earned", body: "Closed deals, your split after caps and tiers, and what is scheduled to close next month.", image: "/site/s-revenue.png", alt: "Earnings by month chart", w: 2220, h: 762 },
];

export default function WelcomePage() {
  return (
    <div data-site className="overflow-x-clip">
      <SiteNav />

      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1240px] items-center gap-14 px-5 pt-12 pb-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pt-16">
        <Reveal>
          <h1 className="text-5xl leading-[1.02] font-light tracking-tight text-balance sm:text-6xl lg:text-[4.2rem]">
            Run your real estate business from <span className="text-accent">one screen</span>.
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg text-ink/70">Leads, listings, deals and follow-up in one place, with AI that drafts the work and you approve it.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="group flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 font-medium text-on-light transition hover:bg-accent-strong active:scale-[0.98]">
              Create account <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/store" className="flex min-h-12 items-center rounded-full border border-white/15 px-6 hover:bg-white/5">Browse the store</Link>
          </div>
        </Reveal>
        <HeroVisual main="/site/s-leads.png" inset="/site/s-today.png" />
      </section>

      <Marquee items={CAPABILITIES} />

      <section id="product" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 pt-24 sm:px-8">
        <Reveal><h2 className="max-w-[18ch] text-4xl font-light tracking-tight sm:text-5xl">From first click to closing, without the busywork.</h2></Reveal>
        <div className="mt-6"><ScrollStory steps={STORY} /></div>
      </section>

      <section id="trust" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 py-28 sm:px-8">
        <Reveal>
          <p className="text-sm tracking-[0.18em] text-accent uppercase">Built to be trusted</p>
          <h2 className="mt-3 max-w-[20ch] text-4xl font-light tracking-tight sm:text-5xl">The guardrails come switched on.</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Reveal className="md:col-span-4 md:row-span-2">
            <div className="relative h-full overflow-hidden rounded-[28px] bg-[radial-gradient(120%_90%_at_0%_0%,rgba(197,243,106,0.22),transparent_55%),linear-gradient(160deg,#1d2014,#151515)] p-8 sm:p-10">
              <Sparkles aria-hidden className="size-7 text-accent" />
              <h3 className="mt-6 max-w-[16ch] text-3xl font-light sm:text-4xl">AI drafts. You decide what gets sent.</h3>
              <p className="mt-4 max-w-[46ch] text-ink/70">Replies, call openers, listing descriptions and plans are suggestions with their reasons. Nothing reaches a client until a person sends it.</p>
              <ul className="mt-8 grid gap-2.5 text-sm text-ink/80 sm:grid-cols-2">
                {["Replies in the language the lead writes in", "Suggests only homes from your own listings", "Profile updates quote the lead's own words", "Every AI call is logged and capped"].map((t) => (
                  <li key={t} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />{t}</li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="md:col-span-2">
            <div className="h-full rounded-[28px] bg-surface-2 p-7">
              <Scale aria-hidden className="size-6 text-accent" />
              <h3 className="mt-5 text-xl">Fair Housing checks</h3>
              <p className="mt-2 text-sm text-ink/70">Listing copy and AI answers stay on the home, never on who should live there.</p>
            </div>
          </Reveal>
          <Reveal delay={0.12} className="md:col-span-2">
            <div className="h-full rounded-[28px] bg-[linear-gradient(140deg,#202634,#171717)] p-7">
              <PhoneOff aria-hidden className="size-6 text-accent" />
              <h3 className="mt-5 text-xl">Consent before contact</h3>
              <p className="mt-2 text-sm text-ink/70">Calls and texts wait for consent, the Do Not Call check and your team&apos;s calling hours.</p>
            </div>
          </Reveal>
          <Reveal delay={0.06} className="md:col-span-3">
            <div className="flex h-full items-start gap-5 rounded-[28px] bg-surface-2 p-7">
              <Lock aria-hidden className="size-6 shrink-0 text-accent" />
              <div><h3 className="text-xl">Your team&apos;s data stays your team&apos;s</h3><p className="mt-2 text-sm text-ink/70">Every row is locked to your team in the database, with two-step sign-in for anyone who turns it on.</p></div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="md:col-span-3">
            <div className="flex h-full items-start gap-5 rounded-[28px] bg-[linear-gradient(140deg,#2a2016,#171717)] p-7">
              <FileLock2 aria-hidden className="size-6 shrink-0 text-accent" />
              <div><h3 className="text-xl">Private links, not shared logins</h3><p className="mt-2 text-sm text-ink/70">Clients and coordinators get their own private page for one journey. Turn a link off any time.</p></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-white/5 bg-surface-1/60 py-24">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <Reveal>
            <h2 className="max-w-[20ch] text-4xl font-light tracking-tight sm:text-5xl">Follow-up that runs itself.</h2>
            <p className="mt-4 max-w-[52ch] text-ink/70">Switch on a playbook and the right tasks show up on the right day. Free, and yours to edit.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {STORE.slice(0, 3).map((item, i) => (
              <Reveal key={item.key} delay={i * 0.08}>
                <SpotlightCard className="h-full rounded-[28px]">
                  <Link href={`/store/${item.key}`} className="relative flex h-full flex-col gap-6 rounded-[28px] border border-white/8 bg-surface-2/70 p-7 transition-transform duration-300 hover:-translate-y-1">
                    <div>
                      <p className="text-sm text-accent">{item.category}</p>
                      <h3 className="mt-2 text-xl">{item.name}</h3>
                    </div>
                    <PlaybookPreview item={item} />
                    <span className="mt-auto flex items-center gap-1.5 text-sm text-ink/70">See playbook <ArrowRight aria-hidden className="size-4" /></span>
                  </Link>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
          <Link href="/store" className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm hover:bg-white/5">Browse the store <ArrowRight aria-hidden className="size-4" /></Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-32 sm:px-8">
        <WordReveal text="Less time in your CRM. More time with clients." className="max-w-[16ch] text-5xl leading-[1.05] font-light tracking-tight sm:text-7xl" />
        <div className="mt-12 flex flex-wrap items-center gap-6">
          <Link href="/login" className="group flex min-h-12 items-center gap-2 rounded-full bg-accent px-7 font-medium text-on-light transition hover:bg-accent-strong active:scale-[0.98]">
            Create account <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Image src="/site/s-revenue.png" alt="" width={2220} height={762} sizes="320px" className="hidden h-auto w-80 rounded-2xl border border-white/10 opacity-80 lg:block" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
