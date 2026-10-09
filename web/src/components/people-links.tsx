"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { linkContacts, unlinkContacts } from "@/lib/actions";
import type { Linked } from "@/lib/db";
import { ActionForm, inputAuto, primaryBtn } from "./forms";

const KINDS = { household: "Household", family: "Family", friend: "Friend", colleague: "Colleague", other: "Other" } as const;

/** Spouses, co-buyers, family and friends, linked both ways. */
export function PeopleLinks({ contactId, links, people }: { contactId: string; links: Linked[]; people: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const linked = new Set(links.map((l) => l.id));
  return (
    <div className="flex flex-col gap-3 text-sm">
      {links.length > 0 && (
        <ul className="flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.id} className="flex min-h-10 items-center gap-2">
              <Link href={`/leads/${l.id}`} className="font-medium hover:text-accent">{l.name}</Link>
              <span className="text-muted">{KINDS[l.kind]}{l.note && ` · ${l.note}`}{l.stage && ` · ${l.stage}`}</span>
              <button type="button" disabled={pending} aria-label={`Unlink ${l.name}`} onClick={() => start(() => unlinkContacts(contactId, l.id))}
                className="ml-auto grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"><X aria-hidden className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={linkContacts.bind(null, contactId)} className="flex flex-wrap items-start gap-2">
        {(p) => (
          <>
            <select name="other" required defaultValue="" aria-label="Person" className={`${inputAuto} min-w-0 flex-1`}>
              <option value="" disabled>Link someone…</option>
              {people.filter((x) => x.id !== contactId && !linked.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <select name="kind" defaultValue="household" aria-label="Relationship" className={inputAuto}>
              {Object.entries(KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input name="note" maxLength={200} placeholder="e.g. spouse, co-buyer" aria-label="Note" className={`${inputAuto} min-w-0 flex-1`} />
            <button disabled={p} className={primaryBtn}>{p ? "…" : "Link"}</button>
          </>
        )}
      </ActionForm>
    </div>
  );
}
