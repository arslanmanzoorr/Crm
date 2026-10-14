import type { Metadata } from "next";
import { Reveal, SiteNav } from "@/components/site/motion";
import { SiteFooter } from "@/components/site/footer";
import { StoreGrid } from "@/components/site/store-grid";
import { CATEGORIES, STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: { absolute: "Playbook store · EstateOS" },
  description: "Ready-made follow-up playbooks for real estate agents. Switch one on and the right tasks show up on the right day.",
};

export default function StorePage() {
  return (
    <div data-site className="overflow-x-clip">
      <SiteNav />
      <section className="mx-auto max-w-[1240px] px-5 pt-16 pb-24 sm:px-8 sm:pt-24">
        <Reveal>
          <h1 className="max-w-[16ch] text-5xl leading-[1.04] font-light tracking-tight sm:text-6xl">Playbooks, ready to switch on.</h1>
          <p className="mt-5 max-w-[50ch] text-lg text-ink/70">Follow-up plans built from what works in real estate. Free, and yours to edit once installed.</p>
        </Reveal>
        <div className="mt-14"><StoreGrid items={STORE} categories={Object.values(CATEGORIES)} /></div>
      </section>
      <SiteFooter />
    </div>
  );
}
