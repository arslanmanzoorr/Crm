import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClosingCta, Reveal, SiteFooter, SiteNav } from "@/components/site/signal";
import { breadcrumbs, COPY_UPDATED, jsonLd, organization, SITE, webPage, website } from "@/lib/seo";
import { siteFont } from "@/lib/site-font";
import { S } from "@/lib/site-theme";

export type Topic = {
  path: string;
  /** Short name for breadcrumbs and links. */
  name: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  /** The answer-first opening: what an AI engine should be able to quote on its own. */
  intro: string;
  sections: { h: string; body: ReactNode[]; list?: ReactNode[] }[];
  faq?: { q: string; a: ReactNode }[];
  related: [string, string][];
  /** Shown as "Last reviewed" for pages that describe rules that change. */
  reviewed?: boolean;
  footnote?: ReactNode;
};

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * A marketing topic page (compliance, teams, AI, security): an answer-first opening, sections with plain headings,
 * an FAQ, related pages, and the structured data that ties the page to the site and the product.
 */
export function TopicPage({ t }: { t: Topic }) {
  const ld = jsonLd(organization, website,
    webPage(t.path, t.title, t.description, "WebPage", {
      breadcrumb: { "@id": `${SITE}${t.path}#breadcrumb` }, about: { "@id": `${SITE}/#app` }, dateModified: COPY_UPDATED,
      ...(t.reviewed ? { lastReviewed: COPY_UPDATED } : {}),
    }),
    breadcrumbs([["Estos", "/welcome"], [t.name, t.path]]));
  return (
    <div data-site className={`${siteFont.className} min-h-[100dvh] overflow-x-clip`} style={{ background: S.bg, color: S.ink }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <SiteNav />
      <article>
        <header className="mx-auto max-w-[1240px] px-5 pt-14 pb-16 sm:px-8 sm:pt-24">
          <Reveal eager>
            <p className="text-sm font-semibold tracking-[0.16em] uppercase" style={{ color: S.accentText }}>{t.eyebrow}</p>
            <h1 className="mt-4 max-w-[18ch] text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.98] font-extrabold tracking-[-0.045em]">{t.h1}</h1>
            <p className="mt-8 max-w-[62ch] border-t border-black/15 pt-8 text-xl leading-relaxed" style={{ color: S.muted }}>{t.intro}</p>
            {t.reviewed && <p className="mt-4 text-sm" style={{ color: S.muted }}>Last reviewed {fmtDate(COPY_UPDATED)}</p>}
          </Reveal>
        </header>

        <div className="mx-auto flex max-w-[1240px] flex-col px-5 pb-24 sm:px-8">
          {t.sections.map((s) => (
            <section key={s.h} className="grid gap-4 border-t border-black/10 py-12 lg:grid-cols-[1fr_1.6fr] lg:gap-12">
              <h2 className="max-w-[22ch] text-3xl font-extrabold tracking-[-0.03em]">{s.h}</h2>
              <div className="flex max-w-[64ch] flex-col gap-4 text-lg leading-relaxed" style={{ color: S.muted }}>
                {s.body.map((b, i) => <p key={i}>{b}</p>)}
                {s.list && (
                  <ul className="flex flex-col gap-2.5">
                    {s.list.map((li, i) => (
                      <li key={i} className="flex gap-3"><span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full" style={{ background: S.accent }} /><span>{li}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
          {t.footnote && <p className="max-w-[80ch] border-t border-black/10 pt-6 text-sm" style={{ color: S.muted }}>{t.footnote}</p>}
        </div>

        {t.faq && (
          <section aria-labelledby="faq" className="border-t border-black/10 py-24" style={{ background: S.panel }}>
            <div className="mx-auto grid max-w-[1240px] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_2fr]">
              <h2 id="faq" className="text-5xl font-extrabold tracking-[-0.04em]">Questions</h2>
              <div className="flex flex-col divide-y divide-black/10">
                {t.faq.map((f) => (
                  <div key={f.q} className="py-5 first:pt-0">
                    <h3 className="text-lg font-bold">{f.q}</h3>
                    <p className="mt-2 max-w-[62ch]" style={{ color: S.muted }}>{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <nav aria-label="Related" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8">
          <h2 className="text-sm font-semibold tracking-[0.16em] uppercase" style={{ color: S.muted }}>Read next</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.related.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="group flex min-h-16 items-center justify-between gap-3 rounded-[8px] bg-white px-5 py-4 font-semibold ring-1 ring-black/10 transition hover:ring-black/40">
                  {label}<ArrowRight aria-hidden className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
      <ClosingCta />
      <SiteFooter />
    </div>
  );
}
