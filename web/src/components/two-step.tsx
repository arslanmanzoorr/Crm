"use client";

import { useState, useTransition } from "react";
import { mfaConfirm, mfaEnroll, mfaRemove } from "@/lib/actions";
import { input, primaryBtn } from "./forms";

const pill = "flex min-h-10 items-center rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Two-step sign-in with an authenticator app (Google Authenticator, 1Password, Authy…). */
export function TwoStep({ factors }: { factors: { id: string; name: string; created: string }[] }) {
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (f: () => Promise<{ error?: string; ok?: string } | undefined>) => start(async () => setMsg((await f()) ?? null));
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 text-sm">
      {factors.length > 0 ? (
        <>
          <p><span className="font-medium text-accent-ink">On.</span> Signing in asks for a code from your authenticator app.</p>
          {factors.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted">{f.name} · added {f.created.slice(0, 10)}</span>
              <button type="button" disabled={pending} className={pill} onClick={() => confirm("Turn off two-step sign-in?") && run(() => mfaRemove(f.id))}>Turn off</button>
            </div>
          ))}
        </>
      ) : setup ? (
        <>
          <p>Scan this with your authenticator app, then enter the code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: SVG from Supabase */}
          <img src={setup.qr} alt="QR code for your authenticator app" className="size-44 rounded-xl bg-white p-2" />
          <p className="text-xs text-muted">Can&apos;t scan? Enter this key: <code className="break-all text-ink select-all">{setup.secret}</code></p>
          <div className="flex flex-wrap gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" aria-label="Code from your app" className={`${input} w-32`} />
            <button type="button" disabled={pending} className={primaryBtn} onClick={() => run(() => mfaConfirm(setup.factorId, code))}>{pending ? "Checking…" : "Turn on"}</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted">Off. Add a code from an authenticator app at sign-in, so a stolen password alone can&apos;t open your leads.</p>
          <button type="button" disabled={pending} className={`${pill} w-fit`} onClick={() => start(async () => { const r = await mfaEnroll(); if ("error" in r) setMsg(r); else setSetup(r); })}>{pending ? "Starting…" : "Set up two-step sign-in"}</button>
        </>
      )}
      {msg?.error && <p role="alert" className="text-score-1">{msg.error}</p>}
      {msg?.ok && <p role="status" className="text-muted">{msg.ok}</p>}
    </div>
  );
}
