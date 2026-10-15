"use client";

import { CircleCheck, CircleDashed } from "lucide-react";
import { useState, useTransition } from "react";
import { setCustomDomain, verifyCustomDomain } from "@/lib/actions";
import { CopyLink } from "./open-house-controls";
import { input, primaryBtn } from "./forms";

type Msg = { error?: string; ok?: string } | null;

/** A team's own domain for client pages: claim it, add two DNS records, verify. Sign-in never moves to it. */
export function DomainSettings({ domain, verified, token, dns }: { domain: string | null; verified: boolean; token: string; dns: "ok" | "dns" | null }) {
  const [v, setV] = useState(domain ?? "");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const apex = !!domain && domain.split(".").length === 2;
  const host = domain ? domain.split(".").slice(0, -2).join(".") || "@" : "";
  const records = domain ? [
    apex ? { type: "A", name: "@", value: "76.76.21.21" } : { type: "CNAME", name: host, value: "cname.vercel-dns.com" },
    { type: "TXT", name: `_estateos${host === "@" ? "" : `.${host}`}`, value: token },
  ] : [];

  return (
    <div className="flex flex-col gap-5 rounded-card bg-surface-2 p-5 text-sm">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => setMsg((await setCustomDomain(v)) ?? null)); }}>
        <label className="flex min-w-60 flex-1 flex-col gap-1.5">
          <span className="font-medium">Domain</span>
          <input value={v} onChange={(e) => setV(e.target.value)} placeholder="homes.yourteam.com" autoComplete="off" spellCheck={false} inputMode="url" maxLength={253} className={input} />
        </label>
        <button type="submit" disabled={pending || v.trim() === (domain ?? "")} className={primaryBtn}>{pending ? "Saving…" : "Save"}</button>
        {domain && <button type="button" disabled={pending} onClick={() => { setV(""); start(async () => setMsg((await setCustomDomain("")) ?? null)); }} className="min-h-11 rounded-full px-3 text-muted hover:text-ink">Remove</button>}
      </form>

      {domain && (
        <>
          <p className="flex items-center gap-2 font-medium">
            {verified && dns !== "dns" ? <CircleCheck aria-hidden className="size-5 text-accent-ink" /> : <CircleDashed aria-hidden className="size-5 text-muted" />}
            {!verified ? "Not verified yet" : dns === "dns" ? "Verified, waiting for the CNAME/A record" : "Live"}
          </p>
          {!verified && (
            <>
              <p className="text-muted">Add these at your domain provider. A subdomain like <span className="text-ink">homes.</span>yourteam.com keeps your main website untouched.</p>
              <div className="overflow-x-auto rounded-2xl bg-surface-1">
                <table className="w-full min-w-[520px] text-left">
                  <thead className="text-xs text-muted"><tr><th scope="col" className="px-4 py-2 font-medium">Type</th><th scope="col" className="px-4 py-2 font-medium">Name</th><th scope="col" className="px-4 py-2 font-medium">Value</th><th scope="col"><span className="sr-only">Copy</span></th></tr></thead>
                  <tbody className="divide-y divide-line/5">
                    {records.map((r) => (
                      <tr key={r.type}>
                        <td className="px-4 py-3 font-medium">{r.type}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-xs break-all">{r.value}</td>
                        <td className="px-2 py-1"><CopyLink url={r.value} label={`Copy ${r.type}`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" disabled={pending} className={`${primaryBtn} w-fit`} onClick={() => start(async () => setMsg((await verifyCustomDomain()) ?? null))}>{pending ? "Checking…" : "Verify"}</button>
            </>
          )}
          {verified && <p className="text-muted">New form, open house, booking and portal links use https://{domain}. Links you already shared keep working.</p>}
        </>
      )}
      {msg?.error && <p role="alert" className="text-score-1">{msg.error}</p>}
      {msg?.ok && <p role="status" className="text-muted">{msg.ok}</p>}
    </div>
  );
}
