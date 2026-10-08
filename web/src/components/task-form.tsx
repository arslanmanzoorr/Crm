"use client";

import { useState } from "react";
import { createTask } from "@/lib/actions";
import { ActionForm, input, primaryBtn } from "./forms";

const KINDS = [["call", "Call"], ["showing", "Showing"], ["email", "Email"], ["video", "Video call"], ["cma", "CMA"]];

/** Quick task: what, when, optionally for which lead. Due time is sent as ISO so it keeps the agent's timezone. */
export function TaskForm({ contactId, leads }: { contactId?: string; leads?: { id: string; name: string }[] }) {
  const [local, setLocal] = useState("");
  return (
    <ActionForm action={createTask} className="flex flex-wrap items-start gap-2">
      {(pending) => (
        <>
          {contactId && <input type="hidden" name="contact_id" value={contactId} />}
          <input type="hidden" name="due_at" value={local ? new Date(local).toISOString() : ""} />
          <input name="title" required placeholder="New task…" aria-label="Task" className={`${input} min-w-40 flex-1`} />
          <select name="kind" aria-label="Kind" className={`${input} w-auto`}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {leads && (
            <select name="contact_id" aria-label="Lead" className={`${input} w-auto`}>
              <option value="">No lead</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <input type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} aria-label="Due" className={`${input} w-auto`} />
          <button disabled={pending} className={primaryBtn}>{pending ? "…" : "Add"}</button>
        </>
      )}
    </ActionForm>
  );
}
