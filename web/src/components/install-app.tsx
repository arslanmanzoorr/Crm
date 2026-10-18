"use client";

import { Download, Share, Smartphone } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const standalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** "Install the app": the browser's own install prompt where there is one (Chrome, Edge, Android), and Add to Home
 *  Screen steps on iPhone and iPad. Shows nothing extra once it's installed. */
export function InstallApp() {
  const env = useSyncExternalStore(() => () => {}, () => (standalone() ? "installed" : ios() ? "ios" : "other"), () => "other");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setPrompt(e as Prompt); };
    addEventListener("beforeinstallprompt", h);
    const ok = () => setDone(true);
    addEventListener("appinstalled", ok);
    return () => { removeEventListener("beforeinstallprompt", h); removeEventListener("appinstalled", ok); };
  }, []);

  const body = env === "installed" || done
    ? <p className="text-muted">Installed. EstateOS opens from your home screen like any app.</p>
    : env === "ios"
      ? <p className="text-muted">In Safari, tap <Share aria-label="Share" className="inline size-4 align-text-bottom" /> Share, then <span className="text-ink">Add to Home Screen</span>.</p>
      : prompt
        ? <button type="button" onClick={async () => { await prompt.prompt(); if ((await prompt.userChoice).outcome === "accepted") setDone(true); setPrompt(null); }}
            className="flex min-h-11 w-fit items-center gap-2 rounded-full bg-accent px-5 font-medium text-on-light hover:bg-accent-strong"><Download aria-hidden className="size-4" /> Install EstateOS</button>
        : <p className="text-muted">Open this page in Chrome or Edge on your phone or computer and use <span className="text-ink">Install app</span> in the browser menu.</p>;

  return (
    <div className="flex items-start gap-3 rounded-card bg-surface-2 p-4 text-sm">
      <Smartphone aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
      <div className="flex flex-col gap-2">
        <p><span className="font-medium">Get the app.</span> <span className="text-muted">Home-screen icon, full screen, no app store.</span></p>
        {body}
      </div>
    </div>
  );
}
