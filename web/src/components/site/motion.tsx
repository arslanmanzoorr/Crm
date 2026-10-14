"use client";

// Motion pieces for the marketing site. Each one has a job: guide the eye, tell the product story in order, or
// acknowledge a hover. Under prefers-reduced-motion every piece renders in its final, still state.
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Sticky nav that gains a solid glass backdrop once the page moves. */
export function SiteNav() {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const bg = useTransform(scrollY, [0, 80], ["rgba(14,14,14,0)", "rgba(14,14,14,0.72)"]);
  const border = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.08)"]);
  return (
    <motion.header style={reduce ? { backgroundColor: "rgba(14,14,14,0.9)" } : { backgroundColor: bg, borderColor: border }}
      className="sticky top-0 z-40 border-b backdrop-blur-xl">
      <nav aria-label="Site" className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5 sm:px-8">
        <Link href="/welcome" className="flex items-center gap-2.5 font-medium">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-semibold text-on-light">E</span>
          EstateOS
        </Link>
        <div className="ml-auto hidden items-center gap-1 text-sm text-ink/70 md:flex">
          <Link href="/welcome#product" className="rounded-full px-3.5 py-2 hover:text-ink">Product</Link>
          <Link href="/welcome#trust" className="rounded-full px-3.5 py-2 hover:text-ink">Security</Link>
          <Link href="/store" className="rounded-full px-3.5 py-2 hover:text-ink">Store</Link>
          <Link href="/login" className="rounded-full px-3.5 py-2 hover:text-ink">Sign in</Link>
        </div>
        <Link href="/login" className="ml-auto flex min-h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-light transition-transform hover:bg-accent-strong active:scale-[0.98] md:ml-2">Create account</Link>
      </nav>
    </motion.header>
  );
}

/** Fade-and-rise on first view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Hero product shot: tilted back in 3D, it straightens and lifts as you scroll into the page. */
export function HeroVisual({ main, inset }: { main: string; inset: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const rotateX = useTransform(p, [0.2, 0.55], [18, 0]);
  const scale = useTransform(p, [0.2, 0.55], [0.92, 1]);
  const insetY = useTransform(p, [0.2, 0.8], [60, -40]);
  return (
    <div ref={ref} className="relative [perspective:1600px]">
      <motion.div style={reduce ? undefined : { rotateX, scale }} initial={reduce ? false : { opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE, delay: 0.15 }}
        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-surface-1 shadow-[0_40px_120px_-30px_rgba(197,243,106,0.18)] will-change-transform [transform-origin:50%_0%]">
        <Image src={main} alt="The EstateOS leads board: every lead with its AI score, next step and source." width={2360} height={1520} priority sizes="(min-width: 1024px) 720px, 100vw" className="h-auto w-full" />
      </motion.div>
      <motion.div style={reduce ? undefined : { y: insetY }} initial={reduce ? false : { opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: EASE, delay: 0.45 }}
        className="absolute -bottom-10 -left-4 hidden w-[56%] overflow-hidden rounded-[18px] border border-white/10 bg-surface-1 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:block lg:-left-12">
        <Image src={inset} alt="Today: the calls and follow-ups that matter most, in order." width={2360} height={1280} sizes="(min-width: 1024px) 400px, 56vw" className="h-auto w-full" />
      </motion.div>
    </div>
  );
}

/** One looping strip of capabilities. Pauses on hover; stands still under reduced motion. */
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="group relative overflow-hidden py-8 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="flex w-max motion-safe:animate-[site-marquee_42s_linear_infinite] group-hover:[animation-play-state:paused]">
        {row.map((t, i) => (
          <span key={i} aria-hidden={i >= items.length} className="mr-3 whitespace-nowrap rounded-full border border-white/10 px-5 py-2.5 text-sm text-ink/80">{t}</span>
        ))}
      </div>
    </div>
  );
}

type Step = { title: string; body: string; image: string; alt: string; w: number; h: number };

/** Scroll story: the copy stays pinned while the product screens change, one per step. */
export function ScrollStory({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  if (reduce) {
    return (
      <div className="grid gap-16">
        {steps.map((s) => (
          <div key={s.title} className="grid items-center gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div><h3 className="text-3xl font-light">{s.title}</h3><p className="mt-3 max-w-[42ch] text-ink/70">{s.body}</p></div>
            <Image src={s.image} alt={s.alt} width={s.w} height={s.h} sizes="(min-width: 1024px) 700px, 100vw" className="h-auto w-full rounded-[22px] border border-white/10" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div ref={ref} style={{ height: `${steps.length * 90 + 30}vh` }} className="relative">
      <div className="sticky top-16 grid min-h-[calc(100dvh-4rem)] items-center gap-10 py-10 lg:grid-cols-[1fr_1.4fr]">
        <ol className="flex flex-col gap-8">
          {steps.map((s, i) => <StoryCopy key={s.title} step={s} i={i} n={steps.length} p={scrollYProgress} />)}
        </ol>
        <div className="relative aspect-[1.55] overflow-hidden rounded-[22px] border border-white/10 bg-surface-1">
          {steps.map((s, i) => <StoryImage key={s.title} step={s} i={i} n={steps.length} p={scrollYProgress} />)}
        </div>
      </div>
    </div>
  );
}

// Fade window for step i, kept inside [0, 1] and strictly increasing (the native scroll timeline requires both).
const windowFor = (i: number, n: number) => {
  const s = i / n, e = (i + 1) / n;
  return [Math.max(0, s - 0.04), Math.max(0.001, s + 0.04), Math.min(0.999, e - 0.04), Math.min(1, e + 0.04)];
};

function StoryCopy({ step, i, n, p }: { step: Step; i: number; n: number; p: MotionValue<number> }) {
  const [a, b, c, d] = windowFor(i, n);
  const first = i === 0, last = i === n - 1;
  const opacity = useTransform(p, [a, b, c, d], [first ? 1 : 0.28, 1, 1, last ? 1 : 0.28]);
  const x = useTransform(p, [a, b], [first ? 0 : -6, 0]);
  return (
    <motion.li style={{ opacity, x }} className="max-w-[44ch]">
      <h3 className="text-2xl font-light sm:text-3xl">{step.title}</h3>
      <p className="mt-2 text-ink/70">{step.body}</p>
    </motion.li>
  );
}

function StoryImage({ step, i, n, p }: { step: Step; i: number; n: number; p: MotionValue<number> }) {
  const [a, b, c, d] = windowFor(i, n);
  const first = i === 0, last = i === n - 1;
  const opacity = useTransform(p, [a, b, c, d], [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const scale = useTransform(p, [a, b, c, d], [1.06, 1, 1, 0.98]);
  return (
    <motion.div style={{ opacity, scale }} className="absolute inset-0">
      <Image src={step.image} alt={step.alt} fill sizes="(min-width: 1024px) 700px, 100vw" className="object-cover object-left-top" />
    </motion.div>
  );
}

/** Closing headline: words light up as they scroll into place. */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "start 35%"] });
  const words = text.split(" ");
  if (reduce) return <h2 ref={ref} className={className}>{text}</h2>;
  return (
    <h2 ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => <Word key={i} w={w} p={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />)}
    </h2>
  );
}

function Word({ w, p, range }: { w: string; p: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(p, range, [0.16, 1]);
  return <motion.span aria-hidden style={{ opacity }} className="inline-block pr-[0.25em]">{w}</motion.span>;
}

/** Card border that lights up where the pointer is (feedback for "this is clickable"). */
export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const x = useMotionValue(-200), y = useMotionValue(-200);
  const bg = useMotionTemplate`radial-gradient(260px circle at ${x}px ${y}px, rgba(197,243,106,0.16), transparent 70%)`;
  return (
    <div onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); x.set(e.clientX - r.left); y.set(e.clientY - r.top); }}
      onPointerLeave={() => { x.set(-200); y.set(-200); }} className={`group relative ${className ?? ""}`}>
      <motion.div aria-hidden style={{ background: bg }} className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {children}
    </div>
  );
}
