"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey } from "@/lib/actions";
import type { ApiKey } from "@/lib/db";
import { input, primaryBtn } from "./forms";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Create, list and revoke API keys. A new key is shown once. */
export function ApiKeys({ keys, base }: { keys: ApiKey[]; base: string }) {
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-2 p-5 text-sm">
      {keys.length > 0 && (
        <ul className="flex flex-col divide-y divide-line/5">
          {keys.map((k) => (
            <li key={k.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0"><span className="font-medium">{k.name}</span> <code className="text-muted">{k.prefix}…</code>
                <span className="block text-xs text-muted">Created {k.createdAt.slice(0, 10)} · {k.lastUsedAt ? `last used ${k.lastUsedAt.slice(0, 10)}` : "never used"}</span></span>
              <button type="button" disabled={pending} className={pill} onClick={() => confirm(`Revoke "${k.name}"? Anything using it stops working.`) && start(async () => { const r = await revokeApiKey(k.id); setErr(r?.error ?? null); })}>Revoke</button>
            </li>
          ))}
        </ul>
      )}
      {fresh ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-1 p-4">
          <p className="font-medium">Copy this key now. It won&apos;t be shown again.</p>
          <code className="break-all select-all">{fresh}</code>
          <div className="flex gap-2">
            <button type="button" className={pill} onClick={() => navigator.clipboard.writeText(fresh).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
              {copied ? <Check aria-hidden className="size-4 text-accent-ink" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy key"}
            </button>
            <button type="button" className={pill} onClick={() => setFresh(null)}>Done</button>
          </div>
        </div>
      ) : (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createApiKey(name); if ("error" in r) setErr(r.error); else { setFresh(r.key); setName(""); setErr(null); } }); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Key name, e.g. Website" aria-label="Key name" className={`${input} min-w-0 flex-1`} />
          <button disabled={pending || !name.trim()} className={primaryBtn}>{pending ? "Creating…" : "Create key"}</button>
        </form>
      )}
      {err && <p role="alert" className="text-score-1">{err}</p>}
      <details className="text-muted">
        <summary className="cursor-pointer text-ink">How to use it</summary>
        <div className="mt-2 flex flex-col gap-2">
          <p>Send the key from your server, never from a web page: <code className="text-ink">Authorization: Bearer eos_…</code>. 120 requests a minute per key.</p>
          <pre className="overflow-x-auto rounded-xl bg-surface-1 p-3 text-xs text-ink">{`GET  ${base}/api/v1/leads?since=2026-01-01T00:00:00Z&limit=100
GET  ${base}/api/v1/listings
POST ${base}/api/v1/leads
     {"name":"Ana Ruiz","email":"ana@example.com","phone":"+15125550100",
      "message":"Saw 14 Oak Ave","source":"Website",
      "consent_call_sms":false,"consent_email":true}`}</pre>
          <p>New leads follow the web form rules: matched to an existing lead by email or phone, consent is only ever added, and the owner gets a call task due in 5 minutes. Only send consent the person actually gave.</p>
        </div>
      </details>
    </div>
  );
}
