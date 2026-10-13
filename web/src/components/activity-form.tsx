"use client";

import { useRef } from "react";
import { addActivity } from "@/lib/actions";
import { Dictate } from "./dictate";
import { ActionForm, primaryBtn, inputAuto } from "./forms";

const CHANNELS = ["Note", "Call", "SMS", "WhatsApp", "Email", "Instagram"];

/** Log a note, call or message on a lead's timeline. The mic turns a spoken voice note into text. */
export function ActivityForm({ contactId }: { contactId: string }) {
  const text = useRef<HTMLInputElement>(null);
  return (
    <ActionForm action={addActivity} className="mb-6 flex flex-wrap items-start gap-2">
      {(pending) => (
        <>
          <input type="hidden" name="contact_id" value={contactId} />
          <select name="channel" aria-label="Type" className={inputAuto}>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select>
          <input ref={text} name="content" aria-label="What happened" placeholder="What happened?" className={`${inputAuto} min-w-0 flex-1`} />
          <Dictate onText={(t) => { if (text.current) text.current.value = t; }} label="Speak a note" />
          <button disabled={pending} className={primaryBtn}>{pending ? "…" : "Log"}</button>
        </>
      )}
    </ActionForm>
  );
}
