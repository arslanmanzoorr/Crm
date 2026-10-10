"use client";

import { useTransition, useState } from "react";
import { setOwner } from "@/lib/actions";
import type { Member } from "@/lib/db";
import { inputAuto } from "./forms";

/** Who works this lead. Changing it saves immediately. */
export function OwnerSelect({ contactId, ownerId, members }: { contactId: string; ownerId: string | null; members: Member[] }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <label className="flex min-w-0 max-w-full items-center gap-2 text-sm">
      <span className="text-muted">Owner</span>
      <select
        defaultValue={ownerId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value || null;
          setErr("");
          start(async () => { try { await setOwner(contactId, v); } catch (x) { setErr((x as Error).message); } });
        }}
        className={`${inputAuto} min-w-0 max-w-full`}
      >
        <option value="">Unassigned</option>
        {members.map((m) => <option key={m.userId} value={m.userId}>{m.email}</option>)}
      </select>
      {err && <span role="alert" className="text-xs text-score-1">{err}</span>}
    </label>
  );
}
