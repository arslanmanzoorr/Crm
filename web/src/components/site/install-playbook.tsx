"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { installPlaybook } from "@/lib/actions";

/** Install for signed-in owners/admins; everyone else is sent to sign in and comes straight back. */
export function InstallPlaybook({ playbook, signedIn }: { playbook: string; signedIn: boolean }) {
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const btn = "flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 font-medium text-on-light transition hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60";
  if (!signedIn) return <Link href={`/login?next=${encodeURIComponent(`/store/${playbook}`)}`} className={`${btn} w-fit`}>Sign in to install</Link>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      {msg?.ok ? (
        <Link href="/automations" className="flex min-h-12 items-center gap-2 rounded-full border border-accent/40 px-6 text-accent"><Check aria-hidden className="size-4" /> Installed: open Automations</Link>
      ) : (
        <button type="button" disabled={pending} className={btn} onClick={() => start(async () => setMsg((await installPlaybook(playbook)) ?? null))}>{pending ? "Installing…" : "Install playbook"}</button>
      )}
      {msg?.error && <p role="alert" className="text-sm text-score-1">{msg.error}</p>}
    </div>
  );
}
