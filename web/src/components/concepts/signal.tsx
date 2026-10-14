"use client";

// Concept D, "Signal Mono": black and white with one signal orange, heavy grotesk. Motion jobs: per-letter drop
// (a confident opening), circular reveal of the product (one big focus moment), expanding panels (explore by choice).
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const C = { bg: "#f4f4f4", ink: "#111111", muted: "#5a5a5a", accent: "#ff4f1a" };

function Letters({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <span aria-label={text} className="inline-block">
      {[...text].map((ch, i) => (
        <motion.span key={i} aria-hidden className="inline-block whitespace-pre" initial={reduce ? false : { y: "-0.6em", opacity: 0, rotate: -6 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 22, delay: delay + i * 0.025 }}>{ch}</motion.span>
      ))}
    </span>
  );
}

function CircleReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const r = useSpring(useTransform(scrollYProgress, [0, 1], [8, 78]), { stiffness: 90, damping: 24 });
  const clip = useMotionTemplate`circle(${r}% at 50% 50%)`;
  return (
    <div ref={ref} className="px-5 py-24 sm:px-8">
      <motion.div style={reduce ? undefined : { clipPath: clip }} className="mx-auto max-w-[1240px] overflow-hidden rounded-[8px] bg-[#0e0e0e]">
        <Image src="/site/s-leads.png" alt="The EstateOS leads board" width={2360} height={1520} sizes="100vw" className="h-auto w-full" />
      </motion.div>
    </div>
  );
}

const FEATURES = [
  { k: "Leads", h: "Every lead scored, with the reason.", img: "/site/s-leads.png", w: 2360, hh: 1520 },
  { k: "Today", h: "The calls that matter, in order.", img: "/site/s-today.png", w: 2360, hh: 1280 },
  { k: "Clients", h: "One page per person.", img: "/site/s-lead.png", w: 2360, hh: 1400 },
  { k: "Money", h: "Your share, month by month.", img: "/site/s-revenue.png", w: 2220, hh: 762 },
];

function Accordion() {
  const [open, setOpen] = useState(0);
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 sm:px-8 lg:h-[520px] lg:flex-row">
      {FEATURES.map((f, i) => {
        const on = open === i;
        return (
          <motion.button key={f.k} type="button" layout={!reduce} onMouseEnter={() => setOpen(i)} onFocus={() => setOpen(i)} onClick={() => setOpen(i)} aria-expanded={on}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            className={`relative overflow-hidden rounded-[8px] text-left ${on ? "lg:flex-[4]" : "lg:flex-1"} ${on ? "text-white" : ""}`} style={{ background: on ? C.ink : "#e6e6e6" }}>
            <div className="flex h-full flex-col justify-between gap-6 p-6">
              <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide"><span>{f.k}</span><ArrowUpRight aria-hidden className="size-5" style={{ color: on ? C.accent : C.ink }} /></div>
              {on && (
                <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
                  <h3 className="max-w-[20ch] text-3xl font-bold tracking-tight">{f.h}</h3>
                  <Image src={f.img} alt="" width={f.w} height={f.hh} sizes="700px" className="mt-6 h-auto max-h-[300px] w-auto max-w-full rounded-[6px] object-contain object-left-top" />
                </motion.div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export function Signal({ font }: { font: string }) {
  return (
    <div data-site className={`${font} min-h-[100dvh] overflow-x-clip`} style={{ background: C.bg, color: C.ink }}>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f4f4]/85 backdrop-blur-xl">
        <nav aria-label="Site" className="mx-auto flex h-16 max-w-[1240px] items-center gap-8 px-5 sm:px-8">
          <Link href="/concepts" className="text-lg font-extrabold tracking-tight">EstateOS<span style={{ color: C.accent }}>.</span></Link>
          <div className="ml-auto hidden gap-7 text-sm font-medium md:flex"><span>Product</span><span>Security</span><Link href="/store">Store</Link><Link href="/login">Sign in</Link></div>
          <Link href="/login" className="ml-auto rounded-[6px] px-4 py-2 text-sm font-semibold text-white md:ml-0" style={{ background: C.ink }}>Create account</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-[1240px] px-5 pt-16 sm:px-8 sm:pt-24">
        <h1 className="text-[clamp(3.2rem,10vw,9.5rem)] leading-[0.9] font-extrabold tracking-[-0.05em]">
          <Letters text="Sell more." /><br /><span style={{ color: C.accent }}><Letters text="Type less." delay={0.3} /></span>
        </h1>
        <div className="mt-10 grid gap-8 border-t border-black/15 pt-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <p className="max-w-[44ch] text-xl" style={{ color: C.muted }}>The real estate CRM that writes the follow-up for you to approve, and keeps every deal on track.</p>
          <div className="flex gap-3">
            <Link href="/login" className="group flex min-h-12 items-center gap-2 rounded-[6px] px-6 font-semibold text-white" style={{ background: C.accent }}>Create account <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
            <Link href="/store" className="flex min-h-12 items-center rounded-[6px] border border-black/20 px-6 font-medium">Browse the store</Link>
          </div>
        </div>
      </section>

      <CircleReveal />

      <section className="pb-28">
        <h2 className="mx-auto mb-10 max-w-[1240px] px-5 text-5xl font-extrabold tracking-[-0.04em] sm:px-8 sm:text-6xl">Pick a screen.</h2>
        <Accordion />
      </section>

      <section className="overflow-hidden py-16" style={{ background: C.ink }}>
        <Link href="/login" className="group flex w-max motion-safe:animate-[site-marquee_24s_linear_infinite] hover:[animation-play-state:paused]">
          {[0, 1].map((k) => (
            <span key={k} aria-hidden={k === 1} className="flex shrink-0 items-center gap-10 pr-10 text-[clamp(3rem,8vw,7rem)] font-extrabold tracking-[-0.04em] text-white">
              Create account <ArrowRight aria-hidden className="size-[0.7em]" style={{ color: C.accent }} /> Create account <ArrowRight aria-hidden className="size-[0.7em]" style={{ color: C.accent }} />
            </span>
          ))}
        </Link>
      </section>
    </div>
  );
}
