import type { Metadata } from "next";
import { ClosingCta, Reveal, SiteFooter, SiteNav } from "@/components/site/signal";
import { S } from "@/lib/site-theme";
import { StoreGrid } from "@/components/site/store-grid";
import { siteFont } from "@/lib/site-font";
import { CATEGORIES, STORE } from "@/lib/store";
import { breadcrumbs, jsonLd, og, SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Playbook store · Estos" },
  description: "Ready-made follow-up playbooks for real estate agents. Switch one on and the right tasks show up on the right day.",
  alternates: { canonical: "/store" },
  openGraph: og("/store", "Playbook store · Estos", "Ready-made follow-up playbooks for real estate agents."),
};

const LD = jsonLd(breadcrumbs([["Estos", "/welcome"], ["Playbook store", "/store"]]), {
  "@type": "ItemList", name: "Estos follow-up playbooks", numberOfItems: STORE.length,
  itemListElement: STORE.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/store/${s.key}`, name: s.name })),
});

export default function StorePage() {
  return (
    <div data-site className={`${siteFont.className} min-h-[100dvh] overflow-x-clip`} style={{ background: S.bg, color: S.ink }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LD }} />
      <SiteNav />
      <section className="mx-auto max-w-[1240px] px-5 pt-14 pb-28 sm:px-8 sm:pt-24">
        <Reveal>
          <h1 className="max-w-[14ch] text-[clamp(3rem,7vw,6rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">Playbooks, ready to switch on.</h1>
          <p className="mt-6 max-w-[50ch] text-xl" style={{ color: S.muted }}>Follow-up plans built from what works in real estate. Free, and yours to edit once installed.</p>
        </Reveal>
        <div className="mt-14 border-t border-black/15 pt-10"><StoreGrid items={STORE} categories={Object.values(CATEGORIES)} /></div>
      </section>
      <ClosingCta />
      <SiteFooter />
    </div>
  );
}
