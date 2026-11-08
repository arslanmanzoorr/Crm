import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PricingPlans } from "@/components/site/pricing-plans";
import { CtaTicker, Reveal, SiteFooter, SiteNav } from "@/components/site/signal";
import { LEGAL } from "@/lib/legal";
import { BILLING_LIVE, TRIAL_DAYS, YEARLY_MONTHS } from "@/lib/plans";
import { siteFont } from "@/lib/site-font";
import { S } from "@/lib/site-theme";

export const metadata: Metadata = {
  title: { absolute: "Pricing · Estos" },
  description: "Simple per-agent pricing for the real estate CRM that writes the follow-up for you. Assistants free, no setup fees, cancel any time.",
};

const FAQ: [string, ReactNode][] = [
  ["Who counts as an agent?", "Every owner, admin and agent on your team. Assistants are free, so you never pay extra for help."],
  ["How does the free trial work?", BILLING_LIVE
    ? `You get ${TRIAL_DAYS} days of the full plan. We take your card when you start, show you the date your first charge happens, and email you before it does. Cancel online before then and you pay nothing.`
    : `When paid plans launch, new teams get ${TRIAL_DAYS} days of the full plan first. You'll add a card when you start, see the date of your first charge, and get an email before it happens. Cancel online before then and you pay nothing.`],
  ["Can I cancel any time?", <>Yes, online, in a few clicks: the same way you signed up. Plans renew every month or year until you cancel, and you keep your plan until the end of the period you paid for. See our <Link key="r" href="/legal/refunds" className="underline">refunds and cancellation policy</Link>.</>],
  ["Are there setup fees or contracts?", `No setup fees, no contracts, no hidden fees. Monthly plans are month to month; yearly plans cost ${YEARLY_MONTHS} months and renew yearly. Sales tax is added where the law requires it.`],
  ["What happens to my data if I leave?", "It's yours. Owners and admins can download everything from Account at any time, and for 30 days after an account closes."],
  ["Do you use my data to train AI?", <>No. AI requests only go to providers that neither store nor train on them. Details are in our <Link key="p" href="/legal/privacy" className="underline">privacy policy</Link>.</>],
];

export default function PricingPage() {
  return (
    <div data-site className={`${siteFont.className} min-h-[100dvh] overflow-x-clip`} style={{ background: S.bg, color: S.ink }}>
      <SiteNav />
      <section className="mx-auto max-w-[1240px] px-5 pt-14 pb-24 sm:px-8 sm:pt-24">
        <Reveal>
          <h1 className="max-w-[14ch] text-[clamp(3rem,7vw,6rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">Priced per agent. Assistants free.</h1>
          <p className="mt-6 max-w-[52ch] text-xl" style={{ color: S.muted }}>No setup fees, no contracts. Pay monthly, or yearly and get {12 - YEARLY_MONTHS} months free.</p>
        </Reveal>
        {!BILLING_LIVE && (
          <p className="mt-10 max-w-[70ch] rounded-[8px] border-l-4 bg-white p-5 text-sm ring-1 ring-black/10" style={{ borderColor: S.accent }}>
            <b>Early access: {LEGAL.product} is free while we finish billing.</b> These are the prices paid plans will launch with. We&apos;ll give at least 30 days&apos; notice before
            billing starts, and nobody is charged without choosing a plan and agreeing to it first.
          </p>
        )}
        <div className="mt-10"><PricingPlans /></div>
        <p className="mt-6 text-sm" style={{ color: S.muted }}>Prices in US dollars, per agent, plus sales tax where it applies. AI features have a daily fair-use limit.</p>
      </section>

      <section className="border-t border-black/10 py-24" style={{ background: S.panel }}>
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-5xl font-extrabold tracking-[-0.04em]">Questions</h2>
          <dl className="flex flex-col divide-y divide-black/10">
            {FAQ.map(([q, a]) => (
              <div key={q} className="py-5 first:pt-0">
                <dt className="text-lg font-bold">{q}</dt>
                <dd className="mt-2 max-w-[62ch]" style={{ color: S.muted }}>{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <CtaTicker />
      <SiteFooter />
    </div>
  );
}
