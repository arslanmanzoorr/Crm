"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { createMcpToken, revokeMcpToken, revokeOAuthApp } from "@/lib/actions";
import type { McpToken } from "@/lib/db";
import { input, primaryBtn } from "./form-classes";
import { LocalTime } from "./local-time";

const pill = "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";
const DAY = { month: "short", day: "numeric", year: "numeric" } as const;
const day = (ts: string) => <LocalTime ts={ts} opts={DAY} />;

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className={pill} onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
      {copied ? <Check aria-hidden className="size-4 text-accent-ink" /> : <Copy aria-hidden className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

/** Personal tokens: create (shown once), list, revoke. */
export function McpTokens({ tokens }: { tokens: McpToken[] }) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"read" | "write">("write");
  const [days, setDays] = useState<30 | 90 | 365>(90);
  const [fresh, setFresh] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-2 p-5 text-sm">
      {tokens.length > 0 && (
        <ul className="flex flex-col divide-y divide-line/5">
          {tokens.map((t) => (
            <li key={t.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="font-medium">{t.name}</span> <code className="text-muted">{t.prefix}…</code>
                <span className="block text-xs text-muted">
                  {t.scope === "write" ? "Read and change" : "Read only"} · expires {day(t.expiresAt)} · {t.lastUsedAt ? <>last used {day(t.lastUsedAt)}</> : "never used"}
                </span>
              </span>
              <button type="button" disabled={pending} className={pill}
                onClick={() => confirm(`Revoke "${t.name}"? Any AI app using it loses access right away.`) && start(async () => { const r = await revokeMcpToken(t.id); setErr(r?.error ?? null); })}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      {fresh ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-1 p-4">
          <p className="font-medium">Copy this token now. It won&apos;t be shown again.</p>
          <p className="text-muted">Anyone with it can act as you in Estos. Paste it only into your AI app&apos;s settings, never into a chat.</p>
          <code className="break-all select-all">{fresh}</code>
          <div className="flex gap-2">
            <CopyButton text={fresh} label="Copy token" />
            <button type="button" className={pill} onClick={() => setFresh(null)}>Done</button>
          </div>
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          start(async () => { const r = await createMcpToken(name, scope, days); if ("error" in r) setErr(r.error); else { setFresh(r.token); setName(""); setErr(null); } });
        }}>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Cursor on my laptop" className={input} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-muted">It may</span>
              <select value={scope} onChange={(e) => setScope(e.target.value as "read" | "write")} className={input}>
                <option value="write">Read and change</option>
                <option value="read">Only read</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-muted">Expires after</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value) as 30 | 90 | 365)} className={input}>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
              </select>
            </label>
          </div>
          <button disabled={pending || !name.trim()} className={`${primaryBtn} self-start`}>{pending ? "Creating…" : "Create token"}</button>
        </form>
      )}
      {err && <p role="alert" className="text-score-1">{err}</p>}
    </div>
  );
}

/** Apps connected with Estos sign-in, each with Disconnect. */
export function OAuthApps({ apps }: { apps: { id: string; name: string; uri: string; grantedAt: string }[] }) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!apps.length) return <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">No apps connected yet.</p>;
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface-2 p-5 text-sm">
      <ul className="flex flex-col divide-y divide-line/5">
        {apps.map((a) => (
          <li key={a.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0"><span className="font-medium">{a.name || "Unnamed app"}</span>
              <span className="block text-xs text-muted">Connected {day(a.grantedAt)}{a.uri ? ` · ${a.uri.replace(/^https?:\/\//, "")}` : ""}</span></span>
            <button type="button" disabled={pending} className={pill}
              onClick={() => confirm(`Disconnect ${a.name || "this app"}? It loses access right away.`) && start(async () => { const r = await revokeOAuthApp(a.id); setErr(r?.error ?? null); })}>
              Disconnect
            </button>
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="text-score-1">{err}</p>}
    </div>
  );
}
