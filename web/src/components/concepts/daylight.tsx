"use client";

// Concept B, "Daylight Editorial": light, quiet, cobalt accent. Motion jobs: masked line rise (hierarchy on load),
// product shot expanding to full bleed (focus on the product), horizontal pan (walk the workflow in order).
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const C = { bg: "#f2f3f5", ink: "#0f1115", muted: "#55595f", accent: "#2b59ff", card: "#ffffff" };

function MaskLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span className="block" initial={reduce ? false : { y: "105%" }} animate={{ y: "0%" }} transition={{ duration: 1.05, delay, ease: EASE }}>{children}</motion.span>
    </span>
  );
}

function ExpandingShot() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  const scale = useTransform(p, [0, 1], [0.78, 1]);
  const radius = useTransform(p, [0, 1], [36, 0]);
  return (
    <div ref={ref} className="mt-20 px-0">
      <motion.div style={reduce ? { borderRadius: 24 } : { scale, borderRadius: radius }} className="mx-auto overflow-hidden bg-[#0e0e0e] will-change-transform">
        <Image src="/site/s-leads.png" alt="The EstateOS leads board" width={2360} height={1520} sizes="100vw" className="h-auto w-full" priority />
      </motion.div>
    </div>
  );
}

const PANELS = [
  { t: "Capture", h: "Every lead, one list.", b: "Forms, open houses, chat and the API all land here, routed with a call task due in minutes.", img: "/site/s-leads.png", w: 2360, hh: 1520 },
  { t: "Prioritize", h: "Know who to call first.", b: "Today puts the hottest and most overdue first. AI drafts the opener, you send it.", img: "/site/s-today.png", w: 2360, hh: 1280 },
  { t: "Work", h: "The whole client on one page.", b: "Score with its reason, financing, showings and documents together.", img: "/site/s-lead.png", w: 2360, hh: 1400 },
  { t: "Grow", h: "See what you earned.", b: "Your share after splits and caps, and what closes next.", img: "/site/s-revenue.png", w: 2220, hh: 762 },
];

function HorizontalPan() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", `-${(PANELS.length - 1) * 100 / PANELS.length}%`]);
  if (reduce) {
    return (
      <section className="mx-auto grid max-w-[1200px] gap-16 px-6 py-24">
        {PANELS.map((p) => <Panel key={p.t} p={p} />)}
      </section>
    );
  }
  return (
    <section ref={ref} style={{ height: `${PANELS.length * 100}vh` }} className="relative">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <motion.div style={{ x, width: `${PANELS.length * 100}vw` }} className="flex">
          {PANELS.map((p) => <div key={p.t} className="w-screen shrink-0 px-6 sm:px-12"><Panel p={p} /></div>)}
        </motion.div>
      </div>
    </section>
  );
}

function Panel({ p }: { p: (typeof PANELS)[number] }) {
  return (
    <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="text-sm font-medium" style={{ color: C.accent }}>{p.t}</p>
        <h3 className="mt-3 text-4xl font-medium tracking-[-0.03em] sm:text-5xl">{p.h}</h3>
        <p className="mt-4 max-w-[38ch] text-lg" style={{ color: C.muted }}>{p.b}</p>
      </div>
      <div className="overflow-hidden rounded-[20px] bg-[#0e0e0e] shadow-[0_30px_80px_-30px_rgba(15,17,21,0.45)]">
        <Image src={p.img} alt={p.h} width={p.w} height={p.hh} sizes="(min-width:1024px) 700px, 100vw" className="h-auto w-full" />
      </div>
    </div>
  );
}

export function Daylight({ font }: { font: string }) {
  return (
    <div data-site className={`${font} min-h-[100dvh] overflow-x-clip`} style={{ background: C.bg, color: C.ink }}>
      <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: "rgba(242,243,245,0.8)" }}>
        <nav aria-label="Site" className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-6">
          <Link href="/concepts" className="text-lg font-semibold tracking-tight">EstateOS</Link>
          <div className="ml-auto hidden gap-7 text-sm md:flex" style={{ color: C.muted }}>
            <span>Product</span><span>Security</span><Link href="/store">Store</Link><Link href="/login">Sign in</Link>
          </div>
          <Link href="/login" className="ml-auto rounded-full px-4 py-2 text-sm font-medium text-white md:ml-0" style={{ background: C.ink }}>Create account</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-[1200px] px-6 pt-20 sm:pt-24">
        <h1 className="text-[clamp(3rem,7.4vw,6.6rem)] leading-[0.98] font-medium tracking-[-0.045em]">
          <MaskLine delay={0.05}>The CRM that keeps</MaskLine>
          <MaskLine delay={0.16}>your follow-up <span style={{ color: C.accent }}>moving.</span></MaskLine>
        </h1>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45, ease: EASE }} className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <p className="max-w-[40ch] text-lg" style={{ color: C.muted }}>Leads, listings, deals and follow-up in one place. AI drafts the work, you approve it.</p>
          <div className="flex gap-3">
            <Link href="/login" className="group flex min-h-12 items-center gap-2 rounded-full px-6 font-medium text-white transition active:scale-[0.98]" style={{ background: C.accent }}>Create account <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
            <Link href="/store" className="flex min-h-12 items-center rounded-full border px-6" style={{ borderColor: "rgba(15,17,21,0.15)" }}>Browse the store</Link>
          </div>
        </motion.div>
      </section>
      <ExpandingShot />

      <section className="mx-auto max-w-[1200px] px-6 pt-32 pb-8">
        <h2 className="max-w-[18ch] text-5xl font-medium tracking-[-0.04em]">One workflow, start to close.</h2>
      </section>
      <HorizontalPan />

      <section className="px-6 py-28">
        <div className="mx-auto max-w-[1200px] rounded-[32px] px-8 py-20 text-white sm:px-16" style={{ background: C.accent }}>
          <h2 className="max-w-[16ch] text-5xl font-medium tracking-[-0.04em] sm:text-6xl">Spend your day with clients, not software.</h2>
          <Link href="/login" className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-medium" style={{ color: C.ink }}>Create account <ArrowRight aria-hidden className="size-4" /></Link>
        </div>
      </section>
    </div>
  );
}
