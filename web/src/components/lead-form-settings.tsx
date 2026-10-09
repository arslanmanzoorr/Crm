"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { saveLeadForm } from "@/lib/actions";
import { ActionForm, Field, primaryBtn } from "./forms";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm hover:text-accent"
    >
      {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

export function LeadFormSettings({ form, url }: { form: { id: string; public_name: string | null; enabled: boolean }; url: string }) {
  const embed = `<iframe src="${url}" title="Contact form" style="width:100%;max-width:560px;height:720px;border:0"></iframe>`;
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-2 p-5">
      <p className="text-sm text-muted">
        Share this link anywhere: your website, Instagram bio, or a tablet at an open house. New inquiries land in Leads with a
        &ldquo;call within 5 minutes&rdquo; task. Add <code className="rounded bg-surface-3 px-1">?source=Open House</code> to tag where a lead came from.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-2xl bg-surface-1 px-4 py-3 text-xs">{url}</code>
        <CopyButton text={url} label="Copy link" />
        <a href={url} target="_blank" rel="noopener" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm hover:text-accent">
          <ExternalLink aria-hidden className="size-4" /> Open
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-2xl bg-surface-1 px-4 py-3 text-xs">{embed}</code>
        <CopyButton text={embed} label="Copy embed code" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Home value page for sellers:</span>
        <code className="min-w-0 flex-1 truncate rounded-2xl bg-surface-1 px-4 py-3 text-xs">{`${url}/value`}</code>
        <CopyButton text={`${url}/value`} label="Copy link" />
      </div>
      <ActionForm action={saveLeadForm} className="flex flex-wrap items-end gap-3">
        {(pending) => (
          <>
            <input type="hidden" name="id" value={form.id} />
            <div className="min-w-56 flex-1">
              <Field label="Name shown on the form" name="public_name" defaultValue={form.public_name ?? ""} maxLength={80} placeholder="e.g. Jane Smith Realty" />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={form.enabled} className="size-5 accent-[var(--color-accent)]" /> Accepting inquiries
            </label>
            <button disabled={pending} className={primaryBtn}>{pending ? "Saving…" : "Save"}</button>
          </>
        )}
      </ActionForm>
    </div>
  );
}
