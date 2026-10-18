"use client";

import { Bell, BellOff, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { WaitingLead } from "@/lib/db";
import { fmtWait, waitLevel, type Wait } from "@/lib/response";

const KEY = "estateos:lead-alerts";
const STEPS: Wait[] = ["late", "later", "overdue"]; // 5, 15 and 60 minutes
const listeners = new Set<() => void>();
const enabled = () => { try { return localStorage.getItem(KEY) === "on" && Notification.permission === "granted"; } catch { return false; } };
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };

/** Per-device opt-in for desktop alerts. In-app alerts work without it. */
export function AlertsToggle() {
  const on = useSyncExternalStore(subscribe, enabled, () => false);
  const supported = useSyncExternalStore(subscribe, () => typeof Notification !== "undefined", () => false);
  if (!supported) return null;
  const flip = async () => {
    try {
      if (on) localStorage.removeItem(KEY);
      else if ((await Notification.requestPermission()) === "granted") localStorage.setItem(KEY, "on");
    } catch {}
    listeners.forEach((l) => l());
  };
  return (
    <button type="button" onClick={flip} aria-pressed={on} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink">
      {on ? <Bell aria-hidden className="size-4" /> : <BellOff aria-hidden className="size-4" />}
      {on ? "Desktop alerts on" : "Alert me on this device"}
    </button>
  );
}

type Toast = { id: string; name: string; text: string };

/** Checks every minute while the app is open. When a lead you're responsible for crosses 5, 15 or 60 minutes without a
 *  reply, shows an in-app alert (and a desktop notification if this device opted in). Owners and admins also hear
 *  about any lead on the team that reaches 60 minutes. Each lead alerts once per step per browser session. */
export function Watchdog() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();
  useEffect(() => {
    let stop = false;
    const seen = (k: string) => { try { if (sessionStorage.getItem(k)) return true; sessionStorage.setItem(k, "1"); } catch {} return false; };
    const check = async () => {
      if (stop || document.visibilityState === "hidden" && !enabled()) return;
      const res = await fetch("/api/watchdog", { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const { leads, team } = (await res.json()) as { leads: WaitingLead[]; team: boolean };
      const fresh: Toast[] = [];
      for (const l of leads) {
        const min = (Math.floor(Date.now() / 60_000) * 60_000 - Date.parse(l.createdAt)) / 60_000; // same clock as the Today list
        const level = waitLevel(min);
        const mineToAnswer = l.mine || !l.owner;
        const step = STEPS.includes(level) && (mineToAnswer || (team && level === "overdue")) ? level : null;
        if (!step || seen(`wd:${l.id}:${step}`)) continue;
        const text = `${mineToAnswer ? "" : `${l.owner}'s lead · `}waiting ${fmtWait(min)} for a first reply`;
        fresh.push({ id: l.id, name: l.name, text });
        if (enabled() && document.visibilityState === "hidden") {
          try { new Notification(`${l.name} is waiting`, { body: text, tag: `wd-${l.id}` }).onclick = () => { window.focus(); router.push(`/leads/${l.id}`); }; } catch {}
        }
      }
      if (fresh.length) setToasts((t) => [...fresh, ...t].slice(0, 3));
    };
    const first = setTimeout(check, 3000);
    const every = setInterval(check, 60_000);
    return () => { stop = true; clearTimeout(first); clearInterval(every); };
  }, [router]);

  if (!toasts.length) return null;
  return (
    <div role="status" aria-live="polite" className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-6">
      {toasts.map((t) => (
        <div key={t.id + t.text} className="flex animate-rise items-start gap-3 rounded-card bg-surface-3 p-4 text-sm shadow-2xl ring-1 ring-line/10">
          <Bell aria-hidden className="mt-0.5 size-4 shrink-0 text-score-1" />
          <p className="min-w-0 flex-1"><span className="font-medium">{t.name}</span> <span className="text-muted">{t.text}</span>
            <Link href={`/leads/${t.id}`} onClick={() => setToasts((x) => x.filter((y) => y !== t))} className="mt-1 block font-medium text-accent-ink hover:underline">Reply now</Link>
          </p>
          <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y !== t))} className="-m-2 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:text-ink">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
