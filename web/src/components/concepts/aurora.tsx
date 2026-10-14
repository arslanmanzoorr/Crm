"use client";

// Concept C, "Aurora Depth": deep teal night, drifting aurora light, glass. Motion jobs: pointer-driven depth on the
// product stack (feels tangible), sticky card stack (one idea at a time), slow aurora (atmosphere, CSS only).
import { ArrowRight, BellRing, Bot, ShieldCheck } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const C = { bg: "#061317", ink: "#e9f4f2", muted: "rgba(233,244,242,0.66)", accent: "#3ee0b0" };

function DepthStack() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 }), sy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotY = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const rotX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const l1 = useLayer(sx, sy, 10), l2 = useLayer(sx, sy, 26), l3 = useLayer(sx, sy, 44);
  return (
    <div onPointerMove={(e) => { if (reduce) return; const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5); }}
      onPointerLeave={() => { mx.set(0); my.set(0); }} className="relative h-[460px] [perspective:1400px] sm:h-[540px]">
      <motion.div style={reduce ? undefined : { rotateX: rotX, rotateY: rotY }} className="relative h-full [transform-style:preserve-3d]">
        <Glass style={reduce ? undefined : l1} className="absolute top-0 right-0 w-[86%]"><Image src="/site/s-leads.png" alt="Leads board" width={2360} height={1520} sizes="600px" className="h-auto w-full" priority /></Glass>
        <Glass style={reduce ? undefined : l2} className="absolute top-[42%] left-0 w-[62%]"><Image src="/site/s-today.png" alt="Today view" width={2360} height={1280} sizes="420px" className="h-auto w-full" /></Glass>
        <Glass style={reduce ? undefined : l3} className="absolute right-[6%] bottom-0 w-[52%]"><Image src="/site/s-revenue.png" alt="Earnings by month" width={2220} height={762} sizes="360px" className="h-auto w-full" /></Glass>
      </motion.div>
    </div>
  );
}

/** Pointer offset for one layer: deeper layers move further, which reads as depth. */
function useLayer(sx: MotionValue<number>, sy: MotionValue<number>, depth: number) {
  return { x: useTransform(sx, [-0.5, 0.5], [-depth, depth]), y: useTransform(sy, [-0.5, 0.5], [-depth, depth]) };
}

function Glass({ children, className, style }: { children: React.ReactNode; className?: string; style?: { x: MotionValue<number>; y: MotionValue<number> } }) {
  return (
    <motion.div style={style} className={`overflow-hidden rounded-[18px] border border-white/15 bg-white/5 p-1.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md ${className ?? ""}`}>
      <div className="overflow-hidden rounded-[13px]">{children}</div>
    </motion.div>
  );
}

const CARDS = [
  { icon: Bot, h: "AI that drafts, never sends", b: "Replies, openers and plans come with their reasons. A person decides what reaches a client.", tint: "linear-gradient(150deg,#0f3b35,#0a1d21)" },
  { icon: BellRing, h: "The right task on the right day", b: "Switch on a playbook and follow-up shows up on time, stopping when the lead moves on.", tint: "linear-gradient(150deg,#123247,#0a1a22)" },
  { icon: ShieldCheck, h: "Guardrails switched on", b: "Fair Housing checks, consent before contact, calling hours and two-step sign-in.", tint: "linear-gradient(150deg,#2a3317,#121a14)" },
];

function StackCard({ card, i, n, progress }: { card: (typeof CARDS)[number]; i: number; n: number; progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const scale = useTransform(progress, [i / n, 1], [1, 1 - (n - i) * 0.05]);
  const Icon = card.icon;
  return (
    <div className="sticky top-24 flex h-[70vh] items-start" style={{ paddingTop: i * 28 }}>
      <motion.div style={reduce ? undefined : { scale }} className="relative isolate w-full origin-top overflow-hidden rounded-[32px] border border-white/10 p-10 sm:p-14">
        <div className="absolute inset-0 -z-10" style={{ background: card.tint }} />
        <Icon aria-hidden className="size-8" style={{ color: C.accent }} />
        <h3 className="mt-8 max-w-[18ch] text-4xl font-light tracking-tight sm:text-5xl">{card.h}</h3>
        <p className="mt-4 max-w-[46ch] text-lg" style={{ color: C.muted }}>{card.b}</p>
      </motion.div>
    </div>
  );
}

function CardStack() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <div ref={ref} className="relative mx-auto max-w-[1000px] px-6">
      {CARDS.map((c, i) => <div key={c.h} className="relative"><StackCard card={c} i={i} n={CARDS.length} progress={scrollYProgress} /></div>)}
    </div>
  );
}

export function Aurora({ font }: { font: string }) {
  const reduce = useReducedMotion();
  return (
    <div data-site className={`${font} relative min-h-[100dvh] overflow-x-clip`} style={{ background: C.bg, color: C.ink }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 size-[60vw] rounded-full opacity-40 blur-[120px] motion-safe:animate-[aurora-a_22s_ease-in-out_infinite]" style={{ background: "radial-gradient(circle,#18b58c,transparent 60%)" }} />
        <div className="absolute top-1/3 -right-40 size-[55vw] rounded-full opacity-30 blur-[120px] motion-safe:animate-[aurora-b_28s_ease-in-out_infinite]" style={{ background: "radial-gradient(circle,#1491b3,transparent 60%)" }} />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#061317]/60 backdrop-blur-xl">
        <nav aria-label="Site" className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-6">
          <Link href="/concepts" className="font-medium tracking-tight">EstateOS</Link>
          <div className="ml-auto hidden gap-7 text-sm md:flex" style={{ color: C.muted }}><span>Product</span><span>Security</span><Link href="/store">Store</Link><Link href="/login">Sign in</Link></div>
          <Link href="/login" className="ml-auto rounded-full px-4 py-2 text-sm font-medium md:ml-0" style={{ background: C.accent, color: "#04211a" }}>Create account</Link>
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1200px] items-center gap-12 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 1.1, ease: EASE }}>
          <h1 className="text-[clamp(2.8rem,5.6vw,4.8rem)] leading-[1.02] font-light tracking-[-0.035em]">Calm, clear control of every deal.</h1>
          <p className="mt-6 max-w-[42ch] text-lg" style={{ color: C.muted }}>Leads, listings, deals and follow-up in one place, with AI that drafts and you decide.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="group flex min-h-12 items-center gap-2 rounded-full px-6 font-medium shadow-[0_0_0_6px_rgba(62,224,176,0.12)] transition active:scale-[0.98]" style={{ background: C.accent, color: "#04211a" }}>Create account <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
            <Link href="/store" className="flex min-h-12 items-center rounded-full border border-white/15 bg-white/5 px-6 backdrop-blur">Browse the store</Link>
          </div>
        </motion.div>
        <motion.div initial={reduce ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.2, ease: EASE }}><DepthStack /></motion.div>
      </section>

      <section className="relative pt-24 pb-40">
        <h2 className="mx-auto mb-12 max-w-[1000px] px-6 text-4xl font-light tracking-tight sm:text-5xl">What changes on day one.</h2>
        <CardStack />
      </section>
    </div>
  );
}
