"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Download, FileText, Paperclip, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { confirmDocument, deleteDocument, documentUploadUrl, documentUrl } from "@/lib/actions";
import type { StoredDoc } from "@/lib/db";
import { checkUpload, DOC_TYPES, fileSize } from "@/lib/docs";
import { LocalTime } from "./local-time";

type Parent = { property_id?: string; deal_id?: string; contact_id?: string };
const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Files on a listing, deal or lead. Uploads go straight to private storage; downloads use one-minute links. */
export function Documents({ parent, docs }: { parent: Parent; docs: StoredDoc[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function upload(files: FileList) {
    setError(null);
    const storage = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!).storage.from("documents");
    for (const f of Array.from(files)) {
      const problem = checkUpload(f);
      if (problem) { setError(`${f.name}: ${problem}`); continue; }
      setBusy(`Uploading ${f.name}…`);
      try {
        const slot = await documentUploadUrl(parent, { name: f.name, size: f.size, type: f.type });
        const { error: up } = await storage.uploadToSignedUrl(slot.path, slot.token, f, { contentType: f.type });
        if (up) throw new Error(up.message);
        await confirmDocument(parent, { path: slot.path, name: f.name, size: f.size, type: f.type });
      } catch (e) {
        setError(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
  }

  const open = (id: string) => start(async () => { const url = await documentUrl(id); if (url) window.location.assign(url); else setError("That file isn't available."); });

  return (
    <div className="flex flex-col gap-3">
      {docs.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {docs.map((d) => (
            <li key={d.id} className="flex min-h-14 items-center gap-3 px-4 py-2 text-sm">
              <FileText aria-hidden className="size-5 shrink-0 text-muted" />
              <span className="min-w-0 flex-1"><span className="block truncate">{d.name}</span><span className="text-xs text-muted">{DOC_TYPES[d.mime] ?? "File"} · {fileSize(d.size)} · <LocalTime ts={d.createdAt} opts={{ month: "short", day: "numeric" }} /></span></span>
              <button type="button" disabled={pending} onClick={() => open(d.id)} aria-label={`Download ${d.name}`} className="grid size-10 place-items-center rounded-full hover:bg-surface-3"><Download aria-hidden className="size-4" /></button>
              <button type="button" disabled={pending} onBlur={() => setArmed(null)} aria-label={armed === d.id ? `Press again to delete ${d.name}` : `Delete ${d.name}`}
                onClick={() => (armed === d.id ? start(() => deleteDocument(d.id)) : setArmed(d.id))}
                className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 ${armed === d.id ? "bg-score-1 font-medium text-on-light" : "text-muted hover:bg-surface-3 hover:text-score-1"}`}>
                <Trash2 aria-hidden className="size-4" />{armed === d.id && "Delete?"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${pill} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent`}>
          <Paperclip aria-hidden className="size-4" />{busy ? "Uploading…" : "Add files"}
          <input ref={input} type="file" multiple disabled={!!busy} accept={Object.keys(DOC_TYPES).join(",")} onChange={(e) => e.target.files && upload(e.target.files)} className="sr-only" />
        </label>
        <span className="text-xs text-muted">PDF, photos, Word, Excel. Up to 25 MB each. Private to your team.</span>
      </div>
      <p aria-live="polite" className="text-sm text-muted empty:hidden">{busy}</p>
      {error && <p role="alert" className="text-sm text-score-1">{error}</p>}
    </div>
  );
}
