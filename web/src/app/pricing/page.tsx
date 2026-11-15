import type { Metadata } from "next";
import Link from "next/link";
import { PricingPlans } from "@/components/site/pricing-plans";
import { ClosingCta, Reveal, SiteFooter, SiteNav } from "@/components/site/signal";
import { LEGAL } from "@/lib/legal";
import { BILLING_LIVE, YEARLY_MONTHS } from "@/lib/plans";
import { breadcrumbs, FAQ, jsonLd, og, organization, software } from "@/lib/seo";
import { siteFont } from "@/lib/site-font";
import { S } from "@/lib/site-theme";

export const metadata: Metadata = {
  title: { absolute: "Pricing · Estos" },
  description: "Simple per-agent pricing for the real estate CRM that writes the follow-up for you. Assistants free, no setup fees, cancel any time.",
  alternates: { canonical: "/pricing" },
  openGraph: og("/pricing", "Pricing · Estos", "Simple per-agent pricing: Starter $29, Pro $59, Team $89 per agent per month. Assistants free, no setup fees, cancel any time."),
};

const LD = jsonLd(organization, software, breadcrumbs([["Estos", "/welcome"], ["Pricing", "/pricing"]]));


export default function PricingPage() {
  return (
    <div data-site className={`${siteFont.className} min-h-[100dvh] overflow-x-clip`} style={{ background: S.bg, color: S.ink }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LD }} />
      <SiteNav />
      <section className="mx-auto max-w-[1240px] px-5 pt-14 pb-24 sm:px-8 sm:pt-24">
        <Reveal>
          <h1 className="max-w-[14ch] text-[clamp(3rem,7vw,6rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">Priced per agent. Assistants free.</h1>
          <p className="mt-6 max-w-[52ch] text-xl" style={{ color: S.muted }}>No setup fees, no contracts. Pay monthly, or yearly and get {12 - YEARLY_MONTHS} months free.</p>
        </Reveal>
        {!BILLING_LIVE && (
          <p className="mt-10 max-w-[70ch] rounded-[8px] bg-white p-5 text-sm ring-1 ring-black/10">
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
            {FAQ.map(({ q, a, link }) => (
              <div key={q} className="py-5 first:pt-0">
                <dt className="text-lg font-bold">{q}</dt>
                <dd className="mt-2 max-w-[62ch]" style={{ color: S.muted }}>{a}{link && <> <Link href={link.href} className="underline">{link.text}</Link></>}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <ClosingCta />
      <SiteFooter />
    </div>
  );
}
