import Link from "next/link";
import type { ReactNode } from "react";
import { CookieNotice } from "@/components/cookie-notice";
import { LEGAL, LEGAL_PAGES as PAGES, operator } from "@/lib/legal";

/** Public legal pages: plain, readable, no app chrome. */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 py-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/welcome" className="text-lg font-semibold tracking-tight">{LEGAL.product}<span className="text-accent-ink">.</span></Link>
        <Link href="/legal" className="text-sm text-muted hover:text-ink">All policies</Link>
      </header>
      <article className="legal flex flex-col gap-4 leading-relaxed [&_a]:text-accent-ink [&_a]:underline [&_h1]:text-4xl [&_h1]:font-light [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-light [&_h3]:mt-2 [&_h3]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_td]:border-t [&_td]:border-line/10 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium">
        {children}
      </article>
      <footer className="flex flex-col gap-3 border-t border-line/10 pt-6 text-sm text-muted">
        <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-2">
          {PAGES.map(([label, href]) => <Link key={href} href={href} className="hover:text-ink">{label}</Link>)}
        </nav>
        <p>
          {operator}
          {LEGAL.address && <> · {LEGAL.address}</>}
          {" · "}<a href={`mailto:${LEGAL.support}`} className="hover:text-ink">{LEGAL.support}</a>
        </p>
      </footer>
      <CookieNotice />
    </div>
  );
}
