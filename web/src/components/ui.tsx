import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";

const avatarTones = ["#c5f36a", "#f5d35d", "#9fd3f5", "#f5a25d", "#d4b5f5", "#7be07b"];

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = 40, ring = false }: { name: string; size?: number; ring?: boolean }) {
  const tone = avatarTones[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarTones.length];
  return (
    <span
      title={name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-on-light ${ring ? "ring-2 ring-bg" : ""}`}
      style={{ width: size, height: size, background: tone, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, size = 28 }: { names: string[]; size?: number }) {
  return (
    <span className="flex -space-x-2">
      {names.map((n) => (
        <Avatar key={n} name={n} size={size} ring />
      ))}
    </span>
  );
}

/** One banding used by labels, dots and filters alike. */
export function scoreLabel(score: number) {
  if (score >= 80) return "Hot";
  if (score >= 50) return "Warm";
  return "Cold";
}

/**
 * Route content entrance. Plain CSS on purpose: a React <ViewTransition> around a Suspense reveal
 * blocks hydration when the browser aborts the transition (hidden tab), leaving a dead page.
 */
export function Reveal({ children }: { children: ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}

/** Lead avatar that morphs between the lead card and the profile header. */
export function LeadAvatar({ id, name, size }: { id: string; name: string; size: number }) {
  return (
    <ViewTransition name={`lead-${id}`} share="morph" default="none">
      <span className="inline-grid shrink-0"><Avatar name={name} size={size} /></span>
    </ViewTransition>
  );
}

/** 5-dot AI lead-score meter. Color is never the only signal: aria-label carries the value. */
export function ScoreDots({ score }: { score: number }) {
  const filled = Math.max(1, Math.round(score / 20));
  const tones = ["bg-score-1", "bg-score-2", "bg-score-3", "bg-score-4", "bg-score-5"];
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Lead score ${score}, ${scoreLabel(score)}`}>
      {tones.map((t, i) => (
        <span key={t} className={`size-3 rounded-full ${i < filled ? t : "bg-surface-3"}`} />
      ))}
    </span>
  );
}

export function Chip({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "accent" }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        tone === "accent" ? "bg-accent text-on-light" : "bg-surface-3 text-ink/80"
      }`}
    >
      {children}
    </span>
  );
}

export function IconButton({
  children,
  label,
  variant = "dark",
  className = "",
  onClick,
}: {
  children: ReactNode;
  label: string;
  variant?: "dark" | "light" | "accent" | "danger";
  className?: string;
  onClick?: () => void;
}) {
  const styles = {
    dark: "bg-surface-3 text-ink hover:bg-surface-2 hover:text-accent",
    light: "bg-surface-light text-on-light hover:bg-white",
    accent: "bg-accent text-on-light hover:bg-accent-strong",
    danger: "bg-score-1 text-white hover:brightness-110",
  }[variant];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-11 shrink-0 place-items-center rounded-full transition duration-150 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Card with the signature inverted notch in the top-right corner holding a ↗ button.
 * The notch is painted with the page background, so the card must sit on `bg-bg`.
 */
export function NotchCard({
  children,
  tone = "dark",
  label,
  href,
  className = "",
}: {
  children: ReactNode;
  tone?: "dark" | "accent" | "light";
  label: string;
  href?: string;
  className?: string;
}) {
  const surface = {
    dark: "bg-surface-2 text-ink",
    accent: "bg-accent text-on-light",
    light: "bg-surface-light text-on-light",
  }[tone];
  return (
    <article className={`group relative rounded-card p-5 transition duration-200 ease-out hover:-translate-y-0.5 has-[a:focus-visible]:-translate-y-0.5 ${surface} ${className}`}>
      {/* notch: a page-colored bite with two inverted corners for a smooth curve; only when there's an arrow to hold */}
      {href && <>
      <span aria-hidden className="absolute -top-px -right-px size-16 rounded-bl-[22px] bg-bg" />
      <span
        aria-hidden
        className="absolute -top-px right-[63px] size-5"
        style={{ background: "radial-gradient(circle at 0 100%, transparent 19.5px, var(--color-bg) 20px)" }}
      />
      <span
        aria-hidden
        className="absolute top-[63px] -right-px size-5"
        style={{ background: "radial-gradient(circle at 0 100%, transparent 19.5px, var(--color-bg) 20px)" }}
      />
      </>}
      {/* Whole card is clickable; the arrow is the keyboard/screen-reader target. Controls inside the card need `relative z-10`. */}
      {href && <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 rounded-card" />}
      {href && <Link
        href={href}
        aria-label={label}
        className="absolute top-1.5 right-1.5 z-10 grid size-12 place-items-center rounded-full bg-surface-2 text-ink ring-1 ring-white/5 transition duration-150 group-hover:bg-accent group-hover:text-on-light"
      >
        <ArrowUpRight className="size-5" />
      </Link>}
      {children}
    </article>
  );
}

/** Loading placeholder shaped like the content it stands in for. Static under reduced motion. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-card bg-surface-2 motion-reduce:animate-none ${className}`} />;
}

/** Common page-level loading states. */
export function LoadingCards({ label, count = 3 }: { label: string; count?: number }) {
  return (
    <div role="status" aria-label={label} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-56" />)}
    </div>
  );
}
