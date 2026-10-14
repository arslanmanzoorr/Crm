"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { installPlaybook } from "@/lib/actions";
import { btnPrimary } from "@/lib/site-theme";

/** Install for signed-in owners/admins; everyone else is sent to sign in and comes straight back. */
export function InstallPlaybook({ playbook, signedIn }: { playbook: string; signedIn: boolean }) {
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  if (!signedIn) return <Link href={`/login?next=${encodeURIComponent(`/store/${playbook}`)}`} className={btnPrimary}>Sign in to install</Link>;
  return (
    <div className="flex flex-wrap items-center gap-4">
      {msg?.ok ? (
        <Link href="/automations" className="inline-flex min-h-12 items-center gap-2 rounded-[6px] bg-[#111111] px-6 font-semibold text-white"><Check aria-hidden className="size-4 text-[#ff4f1a]" /> Installed: open Automations</Link>
      ) : (
        <button type="button" disabled={pending} className={`${btnPrimary} disabled:opacity-60`} onClick={() => start(async () => setMsg((await installPlaybook(playbook)) ?? null))}>{pending ? "Installing…" : "Install playbook"}</button>
      )}
      {msg?.error && <p role="alert" className="text-sm font-medium text-[#b42318]">{msg.error}</p>}
    </div>
  );
}
