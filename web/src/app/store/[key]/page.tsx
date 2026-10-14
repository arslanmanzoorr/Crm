import { ArrowLeft, CalendarClock, ListChecks, Tag, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InstallPlaybook } from "@/components/site/install-playbook";
import { Reveal, SiteNav } from "@/components/site/motion";
import { SiteFooter } from "@/components/site/footer";
import { dbEnabled, supabase } from "@/lib/db";
import { delayLabel, STORE, stepText, storeItem } from "@/lib/store";

export function generateStaticParams() {
  return STORE.map((s) => ({ key: s.key }));
}

export async function generateMetadata({ params }: PageProps<"/store/[key]">): Promise<Metadata> {
  const item = storeItem((await params).key);
  return item ? { title: { absolute: `${item.name} · EstateOS store` }, description: item.why } : {};
}

export default async function PlaybookPage({ params }: PageProps<"/store/[key]">) {
  const item = storeItem((await params).key);
  if (!item) notFound();
  return (
    <div data-site className="overflow-x-clip">
      <SiteNav />
      <article className="mx-auto max-w-[1240px] px-5 pt-12 pb-24 sm:px-8">
        <Link href="/store" className="inline-flex min-h-11 items-center gap-2 text-sm text-ink/60 hover:text-ink"><ArrowLeft aria-hidden className="size-4" /> All playbooks</Link>
        <div className="mt-8 grid gap-14 lg:grid-cols-[1fr_1.05fr]">
          <Reveal>
            <p className="text-sm text-accent">{item.category}</p>
            <h1 className="mt-3 text-4xl leading-[1.08] font-light tracking-tight sm:text-5xl">{item.name}</h1>
            <p className="mt-5 max-w-[48ch] text-lg text-ink/70">{item.why}</p>
            <dl className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="flex gap-3"><Zap aria-hidden className="mt-0.5 size-4 text-accent" /><div><dt className="text-ink/50">Starts when</dt><dd>{item.when}</dd></div></div>
              <div className="flex gap-3"><CalendarClock aria-hidden className="mt-0.5 size-4 text-accent" /><div><dt className="text-ink/50">Runs for</dt><dd>{item.span}</dd></div></div>
              <div className="flex gap-3"><ListChecks aria-hidden className="mt-0.5 size-4 text-accent" /><div><dt className="text-ink/50">Tasks</dt><dd>{item.taskCount}</dd></div></div>
              <div className="flex gap-3"><Tag aria-hidden className="mt-0.5 size-4 text-accent" /><div><dt className="text-ink/50">Price</dt><dd>Free</dd></div></div>
            </dl>
            <div className="mt-10">
              {dbEnabled ? <Suspense fallback={<div className="h-12 w-48 rounded-full bg-surface-2" />}><Install playbook={item.key} /></Suspense> : null}
              <p className="mt-4 max-w-[52ch] text-sm text-ink/50">Playbooks only create tasks and tags. People still do the calling and emailing, and it stops once the lead moves on.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="relative flex flex-col gap-4 rounded-[28px] border border-white/8 bg-surface-2/60 p-7 pl-12 before:absolute before:top-10 before:bottom-10 before:left-[29px] before:w-px before:bg-white/10 sm:p-9 sm:pl-14 sm:before:left-[37px]">
              {item.steps.map((s, i) => (
                <li key={i} className="relative">
                  <span aria-hidden className={`absolute top-1.5 -left-[23px] size-3 rounded-full border-2 sm:-left-[25px] ${i === 0 ? "border-accent bg-accent" : "border-white/30 bg-bg"}`} />
                  <p className="text-xs text-ink/50">{delayLabel(s.after_hours)}</p>
                  <p className="mt-0.5">{stepText(s)}</p>
                  {s.kind === "task" && s.note && <p className="mt-1 text-sm text-ink/60">{s.note}</p>}
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}

async function Install({ playbook }: { playbook: string }) {
  const { data } = await (await supabase()).auth.getUser();
  return <InstallPlaybook playbook={playbook} signedIn={!!data.user} />;
}
