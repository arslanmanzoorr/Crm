"use client";

import { addActivity } from "@/lib/actions";
import { ActionForm, primaryBtn, inputAuto } from "./forms";

const CHANNELS = ["Note", "Call", "SMS", "WhatsApp", "Email", "Instagram"];

/** Log a note, call or message on a lead's timeline. */
export function ActivityForm({ contactId }: { contactId: string }) {
  return (
    <ActionForm action={addActivity} className="mb-6 flex flex-wrap items-start gap-2">
      {(pending) => (
        <>
          <input type="hidden" name="contact_id" value={contactId} />
          <select name="channel" aria-label="Type" className={inputAuto}>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select>
          <input name="content" aria-label="What happened" placeholder="What happened?" className={`${inputAuto} min-w-0 flex-1`} />
          <button disabled={pending} className={primaryBtn}>{pending ? "…" : "Log"}</button>
        </>
      )}
    </ActionForm>
  );
}
