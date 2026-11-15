import { ArrowLeft, CalendarClock, ListChecks, Tag, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InstallPlaybook } from "@/components/site/install-playbook";
import { ClosingCta, Reveal, SiteFooter, SiteNav } from "@/components/site/signal";
import { S } from "@/lib/site-theme";
import { dbEnabled, supabase } from "@/lib/db";
import { siteFont } from "@/lib/site-font";
import { delayLabel, STORE, stepText, storeItem } from "@/lib/store";
import { breadcrumbs, jsonLd, og, organization, SITE, webPage, website } from "@/lib/seo";

export function generateStaticParams() {
  return STORE.map((s) => ({ key: s.key }));
}

export async function generateMetadata({ params }: PageProps<"/store/[key]">): Promise<Metadata> {
  const item = storeItem((await params).key);
  if (!item) return {};
  const title = `${item.name}: a free real estate follow-up playbook · Estos`;
  return { title: { absolute: title }, description: describe(item), alternates: { canonical: `/store/${item.key}` }, openGraph: og(`/store/${item.key}`, title, describe(item)) };
}

const describe = (item: NonNullable<ReturnType<typeof storeItem>>) =>
  `${item.why} ${item.taskCount} task${item.taskCount === 1 ? "" : "s"} over ${item.span}, starting when ${item.when.toLowerCase()}.`;

export default function PlaybookPage({ params }: PageProps<"/store/[key]">) {
  return <Suspense fallback={<div data-site className="min-h-[100dvh]" style={{ background: S.bg }} />}><Playbook params={params} /></Suspense>;
}

async function Playbook({ params }: { params: PageProps<"/store/[key]">["params"] }) {
  const item = storeItem((await params).key);
  if (!item) notFound();
  const facts = [
    { icon: Zap, k: "Starts when", v: item.when },
    { icon: CalendarClock, k: "Runs for", v: item.span },
    { icon: ListChecks, k: "Tasks", v: String(item.taskCount) },
    { icon: Tag, k: "Price", v: "Free" },
  ];
  const path = `/store/${item.key}`;
  const ld = jsonLd(organization, website,
    webPage(path, item.name, describe(item), "ItemPage", { breadcrumb: { "@id": `${SITE}${path}#breadcrumb` }, mainEntity: { "@id": `${SITE}${path}#playbook` } }),
    breadcrumbs([["Estos", "/welcome"], ["Playbook store", "/store"], [item.name, path]]),
    { "@type": "CreativeWork", "@id": `${SITE}${path}#playbook`, name: item.name, description: item.why, genre: item.category, isAccessibleForFree: true,
      inLanguage: "en-US", creator: { "@id": `${SITE}/#org` }, publisher: { "@id": `${SITE}/#org` }, isPartOf: { "@id": `${SITE}/#app` } });
  return (
    <div data-site className={`${siteFont.className} min-h-[100dvh] overflow-x-clip`} style={{ background: S.bg, color: S.ink }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <SiteNav />
      <article className="mx-auto max-w-[1240px] px-5 pt-10 pb-28 sm:px-8">
        <Link href="/store" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium" style={{ color: S.muted }}><ArrowLeft aria-hidden className="size-4" /> All playbooks</Link>
        <div className="mt-8 grid gap-14 lg:grid-cols-[1fr_1.05fr]">
          <Reveal>
            <p className="text-sm font-semibold" style={{ color: S.accentText }}>{item.category}</p>
            <h1 className="mt-3 text-[clamp(2.4rem,5vw,4rem)] leading-[1] font-extrabold tracking-[-0.04em]">{item.name}</h1>
            <p className="mt-6 max-w-[48ch] text-xl" style={{ color: S.muted }}>{item.why}</p>
            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-3">
              {facts.map(({ icon: Icon, k, v }) => (
                <div key={k} className="rounded-[8px] bg-white p-4 ring-1 ring-black/10">
                  <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase" style={{ color: S.muted }}><Icon aria-hidden className="size-4" style={{ color: S.accentText }} />{k}</dt>
                  <dd className="mt-1.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-10">
              {dbEnabled ? <Suspense fallback={<div className="h-12 w-48 rounded-[6px] bg-[#e8e8e8]" />}><Install playbook={item.key} /></Suspense> : null}
              <p className="mt-4 max-w-[52ch] text-sm" style={{ color: S.muted }}>Playbooks only create tasks and tags. People still do the calling and emailing, and it stops once the lead moves on. Playbooks are included in every plan, Starter too. <Link href="/pricing" className="underline">See pricing</Link>.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="relative flex flex-col gap-5 rounded-[8px] bg-[#111111] p-8 pl-14 text-white before:absolute before:top-10 before:bottom-10 before:left-[37px] before:w-px before:bg-white/15 sm:p-10 sm:pl-16 sm:before:left-[45px]">
              {item.steps.map((s, i) => (
                <li key={i} className="relative">
                  <span aria-hidden className={`absolute top-1.5 -left-[25px] size-3 rounded-full border-2 ${i === 0 ? "border-[#ff4f1a] bg-[#ff4f1a]" : "border-white/40 bg-[#111111]"}`} />
                  <p className="text-xs font-semibold tracking-wide text-white/55 uppercase">{delayLabel(s.after_hours)}</p>
                  <p className="mt-1 text-lg font-semibold">{stepText(s)}</p>
                  {s.kind === "task" && s.note && <p className="mt-1 text-sm text-white/65">{s.note}</p>}
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </article>
      <ClosingCta />
      <SiteFooter />
    </div>
  );
}

async function Install({ playbook }: { playbook: string }) {
  const { data } = await (await supabase()).auth.getUser();
  return <InstallPlaybook playbook={playbook} signedIn={!!data.user} />;
}
