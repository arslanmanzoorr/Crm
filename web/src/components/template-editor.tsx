"use client";

import { useTransition } from "react";
import { deleteTemplate, saveTemplate } from "@/lib/actions";
import type { DocTemplate } from "@/lib/db";
import { FIELDS } from "@/lib/templates";
import { ActionForm, Field, input, primaryBtn } from "./forms";

/** New or edit template. Field list doubles as the reference for what can be filled in. */
export function TemplateEditor({ template }: { template?: DocTemplate }) {
  return (
    <ActionForm action={saveTemplate} className="flex flex-col gap-4 rounded-card bg-surface-2 p-5">
      {(pending) => (
        <>
          <h2 className="text-xl">{template ? `Edit ${template.name}` : "New template"}</h2>
          {template && <input type="hidden" name="id" value={template.id} />}
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Field label="Name" name="name" required maxLength={120} defaultValue={template?.name} placeholder="e.g. Buyer representation letter" />
            <Field label="State (optional)" name="state" maxLength={2} defaultValue={template?.state ?? ""} placeholder="TX" />
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Text</span>
            <textarea name="body" required rows={14} maxLength={50000} defaultValue={template?.body} className={`${input} resize-y font-mono text-xs`}
              placeholder={"This agreement between {{client_name}} and {{team_name}} for {{property_address}}…"} />
          </label>
          <details className="text-sm text-muted">
            <summary className="cursor-pointer text-ink">Fields you can use</summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {Object.entries(FIELDS).map(([k, v]) => <li key={k}><code className="text-ink select-all">{`{{${k}}}`}</code> {v}</li>)}
            </ul>
          </details>
          <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : "Save template"}</button>
        </>
      )}
    </ActionForm>
  );
}

export function DeleteTemplate({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className="text-score-1 hover:underline disabled:opacity-60"
      onClick={() => confirm(`Delete the "${name}" template?`) && start(() => deleteTemplate(id))}>{pending ? "…" : "Delete"}</button>
  );
}
