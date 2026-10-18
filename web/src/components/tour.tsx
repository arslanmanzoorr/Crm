"use client";

import { ArrowLeft, ArrowRight, PartyPopper, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPracticeLead, setTourState } from "@/lib/actions";
import { stepsFor, type TourState } from "@/lib/tour";
import { bare } from "./sidebar";

/** Anything can start the tour again (Account, ⌘K, the quests card) by dispatching this event. */
export const startTour = () => window.dispatchEvent(new Event("estateos:tour"));

/** A button that restarts the walkthrough (used on Account). */
export function TakeTourButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return <button type="button" onClick={startTour} className={className}>{children}</button>;
}

type Mode = "idle" | "welcome" | "touring" | "finale";
const PAD = 8;

/** The first-run walkthrough: a welcome card, then a spotlight that moves across the real app with a short card for
 *  each step, then a small celebration. Skippable at every point; progress is saved so it resumes after a reload. */
export function Tour({ state, role, off, team }: { state: TourState; role: string | null; off: readonly string[]; team: string }) {
  const path = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const steps = useMemo(() => stepsFor(role, off), [role, off]);
  const [mode, setMode] = useState<Mode>(off.includes("tour") || state.status ? "idle" : "welcome");
  const [i, setI] = useState(() => Math.max(0, steps.findIndex((s) => s.id === state.step)));
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [wide, setWide] = useState(true);
  const target = useRef<Element | null>(null);
  const dir = useRef(1);
  const head = useRef<HTMLHeadingElement>(null);
  const [found, setFound] = useState<string | null>(null);
  const started = useRef(0);
  const scrolled = useRef(0);
  // scrollIntoView also reaches targets inside scrolling panels. On phones the card is a bottom sheet, so the target
  // goes near the top (scroll-margin in globals.css); on wider screens it's centered.
  const bring = useCallback((el: Element) => {
    scrolled.current = Date.now();
    el.scrollIntoView({ block: innerWidth < 640 ? "start" : "center", behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);
  const step = steps[i];

  const save = (s: TourState) => { void setTourState(s); };
  const skip = useCallback(() => { setMode("idle"); setRect(null); save({ status: "skipped", step: steps[i]?.id }); }, [i, steps]);
  const go = useCallback((d: number) => {
    dir.current = d;
    const n = i + d;
    if (n < 0) return;
    if (n >= steps.length) { setMode("finale"); setRect(null); save({ status: "done" }); return; }
    setI(n);
    save({ step: steps[n].id });
  }, [i, steps]);

  // Restart from anywhere.
  useEffect(() => {
    const h = () => { setI(0); dir.current = 1; setMode("touring"); save({ step: steps[0]?.id }); };
    window.addEventListener("estateos:tour", h);
    return () => window.removeEventListener("estateos:tour", h);
  }, [steps]);

  // While touring, extra room below the page so targets at the very bottom can still scroll clear of the card.
  // Declared before the step effect: effects run in order, so the room exists before the first scroll.
  useEffect(() => {
    if (mode !== "touring") return;
    document.documentElement.dataset.touring = "";
    return () => { delete document.documentElement.dataset.touring; };
  }, [mode]);

  // Each step: go to its page, wait for its target (pages stream in, so give it up to 8s), bring it into view. A
  // missing target (empty page, switched-off module) is skipped in the direction we were moving.
  useEffect(() => {
    if (mode !== "touring" || !step) return;
    if (path !== step.path) { router.push(step.path); return; }
    let tries = 0, timer: ReturnType<typeof setTimeout>;
    const usable = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height >= 20; };
    const find = () => {
      const el = step.target.split(",").map((sel) => [...document.querySelectorAll(sel.trim())].find(usable)).find(Boolean);
      if (!el) { if (++tries < 50) timer = setTimeout(find, 160); else go(dir.current); return; }
      target.current = el;
      started.current = Date.now();
      bring(el);
      setFound(step.id);
    };
    find();
    return () => clearTimeout(timer);
  }, [mode, step, path, router, go, bring]);

  // Follow the target through scrolling (window or any panel), smooth scrolls and content loading in: measure once per
  // frame and re-render only when it actually moved. Then move focus to the step for keyboard and screen readers.
  useEffect(() => {
    if (mode !== "touring") return;
    let raf = 0, last = "";
    const tick = () => {
      const el = target.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const key = `${Math.round(r.top)},${Math.round(r.left)},${Math.round(r.width)},${Math.round(r.height)},${innerWidth}`;
        if (key !== last) { last = key; setRect(r); setWide(innerWidth >= 640); }
        // Content streaming in above can push the target away right after we scrolled: bring it back.
        const off = r.bottom < 0 || r.top > innerHeight * 0.7;
        if (off && Date.now() - started.current < 4000 && Date.now() - scrolled.current > 500) bring(el);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, i, bring]);
  useEffect(() => { if (rect && mode === "touring") head.current?.focus({ preventScroll: true }); }, [i, mode, rect === null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== "touring") return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      const typing = (e.target as HTMLElement)?.closest?.("input,textarea,select,[contenteditable]");
      if (!typing && e.key === "ArrowRight") go(1);
      if (!typing && e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [mode, go, skip]);

  if (bare(path) || mode === "idle") return null;

  if (mode === "welcome") {
    const resume = !!state.step && i > 0;
    return (
      <Backdrop>
        <Card labelledBy="tour-welcome" className="text-center">
          <Sparkles aria-hidden className="mx-auto size-8 text-accent-ink" />
          <h2 id="tour-welcome" className="mt-3 text-2xl">{resume ? "Pick up where you left off?" : `Welcome to ${team}`}</h2>
          <p className="mt-2 text-muted">{resume ? `You're ${i} steps into the tour.` : "Want a 2-minute tour? You can leave any time."}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" autoFocus onClick={() => setMode("touring")} className="min-h-11 rounded-full bg-accent px-6 font-medium text-on-light hover:bg-accent-strong">
              {resume ? "Continue the tour" : "Show me around"}
            </button>
            <button type="button" onClick={skip} className="min-h-11 rounded-full px-6 text-muted hover:bg-surface-3 hover:text-ink">Skip, I&apos;ll explore</button>
          </div>
          <p className="mt-4 text-xs text-muted">Restart it any time from Account or ⌘K.</p>
        </Card>
      </Backdrop>
    );
  }

  if (mode === "finale") return <Finale onClose={() => setMode("idle")} onPractice={async () => { const r = await createPracticeLead(); setMode("idle"); if (r.id) router.push(`/leads/${r.id}`); }} />;

  // Touring.
  const box = rect && step?.path === path && found === step.id && { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
  const cardW = 360, cardH = 230;
  const vh = typeof window === "undefined" ? 800 : innerHeight, vw = typeof window === "undefined" ? 1200 : innerWidth;
  const place: React.CSSProperties = !wide || !box ? {} :
    box.top + box.height + cardH + 16 < vh ? { top: box.top + box.height + 12, left: clamp(box.left, 16, vw - cardW - 16) } :
    box.top - cardH - 16 > 0 ? { top: box.top - cardH - 12, left: clamp(box.left, 16, vw - cardW - 16) } :
    { bottom: 24, right: 24 };
  return (
    <>
      <AnimatePresence>
        {box && (
          <motion.div key="spot" aria-hidden className="pointer-events-none fixed z-50 rounded-[20px] ring-2 ring-accent"
            style={{ boxShadow: "0 0 0 200vmax rgb(0 0 0 / 0.55)" }}
            initial={reduce ? false : { opacity: 0, ...box }} animate={{ opacity: 1, ...box }} exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }} />
        )}
      </AnimatePresence>
      {step && (
        <motion.div key={step.id} role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body"
          className={`fixed z-[60] flex flex-col gap-3 rounded-card bg-surface-2 p-5 text-ink shadow-2xl ring-1 ring-line/10 ${wide ? "w-[360px]" : "inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"}`}
          style={place} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted" aria-live="polite">Step {i + 1} of {steps.length}</p>
            <button type="button" onClick={skip} className="-mr-2 flex min-h-9 items-center gap-1 rounded-full px-2 text-xs text-muted hover:text-ink">
              Skip tour <X aria-hidden className="size-3.5" />
            </button>
          </div>
          <h2 id="tour-title" ref={head} tabIndex={-1} className="text-xl" style={{ outline: "none" }}>{step.title}</h2>
          <p id="tour-body" className="text-sm text-muted">{step.body}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <ol aria-hidden className="flex gap-1.5">
              {steps.map((s, n) => <li key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${n === i ? "w-5 bg-accent" : n < i ? "w-1.5 bg-accent/60" : "w-1.5 bg-line/20"}`} />)}
            </ol>
            <div className="flex gap-2">
              {i > 0 && (
                <button type="button" onClick={() => go(-1)} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-surface-3 hover:bg-surface-light hover:text-on-light">
                  <ArrowLeft aria-hidden className="size-4" />
                </button>
              )}
              <button type="button" onClick={() => go(1)} className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-on-light hover:bg-accent-strong">
                {i === steps.length - 1 ? "Finish" : "Next"} <ArrowRight aria-hidden className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

function Backdrop({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[60] grid place-items-end bg-black/55 p-3 sm:place-items-center">{children}</div>;
}

function Card({ children, labelledBy, className = "" }: { children: React.ReactNode; labelledBy: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div role="dialog" aria-modal="true" aria-labelledby={labelledBy}
      className={`relative w-full max-w-md overflow-hidden rounded-card bg-surface-2 p-7 text-ink shadow-2xl ring-1 ring-line/10 ${className}`}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}>
      {children}
    </motion.div>
  );
}

const COLORS = ["var(--color-accent)", "var(--color-score-1)", "var(--color-score-2)", "var(--color-score-3)", "var(--color-score-5)", "var(--color-ink)"];

function Finale({ onClose, onPractice }: { onClose: () => void; onPractice: () => Promise<void> }) {
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  return (
    <Backdrop>
      <Card labelledBy="tour-done" className="text-center">
        {!reduce && Array.from({ length: 36 }, (_, n) => {
          const a = (n / 36) * Math.PI * 2, r = 120 + ((n * 37) % 90);
          return (
            <motion.span key={n} aria-hidden className="pointer-events-none absolute top-16 left-1/2 size-2 rounded-[2px]" style={{ background: COLORS[n % COLORS.length] }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r + 120, opacity: 0, rotate: (n % 2 ? 1 : -1) * 260 }}
              transition={{ duration: 1.3 + (n % 5) * 0.12, ease: [0.16, 1, 0.3, 1] }} />
          );
        })}
        <PartyPopper aria-hidden className="mx-auto size-9 text-accent-ink" />
        <h2 id="tour-done" className="mt-3 text-2xl">You&apos;re ready</h2>
        <p className="mt-2 text-muted">Want to try it on a practice lead? It can&apos;t reach a real person and clears itself in 14 days.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" autoFocus disabled={busy} onClick={async () => { setBusy(true); await onPractice(); }} className="min-h-11 rounded-full bg-accent px-6 font-medium text-on-light hover:bg-accent-strong disabled:opacity-60">
            {busy ? "Setting it up…" : "Practice on a sample lead"}
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full px-6 text-muted hover:bg-surface-3 hover:text-ink">Start working</button>
        </div>
      </Card>
    </Backdrop>
  );
}
