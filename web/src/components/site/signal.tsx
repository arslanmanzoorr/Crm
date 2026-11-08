"use client";

// Marketing site, direction D "Signal Mono": black and white, one signal orange, heavy grotesk, 6-8px corners.
// Motion jobs: per-letter drop (confident opening), circular product reveal (one focus moment), expanding panels
// (explore by choice), fade-rise on sections (pacing). Everything is still under prefers-reduced-motion.
//
// Contrast: white on #ff4f1a is only 3:1, so orange fills carry black text, and orange TEXT uses deeper shades.
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { btnPrimary, S } from "@/lib/site-theme";
import { CookieNotice } from "@/components/cookie-notice";
import { LEGAL, operator } from "@/lib/legal";

const EASE = [0.16, 1, 0.3, 1] as const;


export function SiteNav() {
  const [open, setOpen] = useState(false);
  const links = [["Product", "/welcome#product"], ["Pricing", "/pricing"], ["Security", "/welcome#trust"], ["Store", "/store"], ["Sign in", "/login"]] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f4f4]/85 backdrop-blur-xl">
      <nav aria-label="Site" className="mx-auto flex h-16 max-w-[1240px] items-center gap-8 px-5 sm:px-8">
        <Link href="/welcome" className="text-lg font-extrabold tracking-tight">Estos<span style={{ color: S.accentDisplay }}>.</span></Link>
        <div className="ml-auto hidden items-center gap-7 text-sm font-medium md:flex">
          {links.map(([l, h]) => <Link key={h} href={h} className="hover:text-[#c2360a]">{l}</Link>)}
        </div>
        <Link href="/login" className="ml-auto hidden rounded-[6px] bg-[#111111] px-4 py-2 text-sm font-semibold text-white md:ml-0 md:inline-flex">Create account</Link>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="ml-auto grid size-10 place-items-center rounded-[6px] md:hidden">
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden border-t border-black/10 md:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {links.map(([l, h]) => <Link key={h} href={h} onClick={() => setOpen(false)} className="py-2.5 text-2xl font-bold tracking-tight">{l}</Link>)}
              <Link href="/login" className={`${btnPrimary} mt-3 justify-center`}>Create account</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#111111] text-white/70">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-12 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Link href="/welcome" className="text-lg font-extrabold tracking-tight text-white">Estos<span style={{ color: S.accent }}>.</span></Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/welcome#product" className="hover:text-white">Product</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/store" className="hover:text-white">Store</Link>
          <Link href="/welcome#trust" className="hover:text-white">Security</Link>
          <Link href="/legal/terms" className="hover:text-white">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/legal" className="hover:text-white">Legal</Link>
          <Link href="/login" className="hover:text-white">Sign in</Link>
        </nav>
        <p>
          &copy; 2026 {operator}{LEGAL.address && <> · {LEGAL.address}</>}
          <br /><a href={`mailto:${LEGAL.support}`} className="hover:text-white">{LEGAL.support}</a>
        </p>
      </div>
      <CookieNotice />
    </footer>
  );
}

/** Fade-and-rise on first view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Letters drop in one by one with a little spring. Screen readers get the plain text. */
export function Letters({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-block">
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => (
        <motion.span key={i} aria-hidden className="inline-block whitespace-pre" initial={reduce ? false : { y: "-0.6em", opacity: 0, rotate: -6 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 22, delay: delay + i * 0.025 }}>{ch}</motion.span>
      ))}
    </span>
  );
}

/** The product, revealed through a circle that widens as you scroll toward it. */
export function CircleReveal({ src, alt, w, h }: { src: string; alt: string; w: number; h: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const r = useSpring(useTransform(scrollYProgress, [0, 1], [8, 78]), { stiffness: 90, damping: 24 });
  const clip = useMotionTemplate`circle(${r}% at 50% 50%)`;
  return (
    <div ref={ref} className="px-5 py-20 sm:px-8 sm:py-24">
      <motion.div style={reduce ? undefined : { clipPath: clip }} className="mx-auto max-w-[1240px] overflow-hidden rounded-[8px] bg-[#0e0e0e]">
        <Image src={src} alt={alt} width={w} height={h} sizes="(min-width: 1280px) 1240px, 100vw" className="h-auto w-full" priority />
      </motion.div>
    </div>
  );
}

export type Panel = { k: string; h: string; b: string; img: string; w: number; hh: number };

/** Feature panels: hover, focus or tap one to open it. On phones they stack and open one at a time. */
export function Panels({ items }: { items: Panel[] }) {
  const [open, setOpen] = useState(0);
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 sm:px-8 lg:h-[560px] lg:flex-row">
      {items.map((f, i) => {
        const on = open === i;
        return (
          <motion.button key={f.k} type="button" layout={!reduce} onMouseEnter={() => setOpen(i)} onFocus={() => setOpen(i)} onClick={() => setOpen(i)} aria-expanded={on}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            className={`relative overflow-hidden rounded-[8px] text-left ${on ? "bg-[#111111] text-white lg:flex-[4]" : "bg-[#e8e8e8] lg:flex-1"}`}>
            <div className="flex h-full flex-col justify-between gap-6 p-6">
              <div className="flex items-center justify-between text-sm font-semibold tracking-wide uppercase"><span>{f.k}</span><ArrowUpRight aria-hidden className="size-5" style={{ color: on ? S.accent : S.ink }} /></div>
              {on && (
                <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
                  <h3 className="max-w-[22ch] text-3xl font-bold tracking-tight">{f.h}</h3>
                  <p className="mt-2 max-w-[48ch] text-white/70">{f.b}</p>
                  <Image src={f.img} alt="" width={f.w} height={f.hh} sizes="(min-width: 1024px) 640px, 100vw" className="mt-6 h-auto max-h-[300px] w-auto max-w-full rounded-[6px] object-contain object-left-top" />
                </motion.div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Closing band: one line that names the moment, one honest promise, two ways forward. */
export function ClosingCta() {
  return (
    <section aria-labelledby="closing-cta" className="bg-[#111111] text-white">
      <Reveal className="mx-auto grid max-w-[1240px] gap-10 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <h2 id="closing-cta" className="text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
          Your next lead is <span style={{ color: S.accent }}>already typing.</span>
        </h2>
        <div className="flex flex-col gap-6">
          <p className="max-w-[40ch] text-lg text-white/70">Be the agent who answers first. Estos drafts the follow-up; you decide what goes out.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={btnPrimary}>Create account <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
            <Link href="/pricing" className="inline-flex min-h-12 items-center rounded-[6px] border border-white/25 px-6 font-medium transition hover:border-white/70">See pricing</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** Card that lifts and gains an ink border on hover (feedback for "this opens"). */
export function LiftCard({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`group relative flex h-full flex-col rounded-[8px] border border-black/10 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-black/70 hover:shadow-[0_24px_60px_-30px_rgba(17,17,17,0.35)] ${className ?? ""}`}>
      {children}
    </Link>
  );
}
