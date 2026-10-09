"use client";

import { useState } from "react";
import { offerMove } from "@/lib/actions";
import { ActionForm, input, inputAuto, primaryBtn } from "./forms";

/** What can happen next, worded from our side of the table. */
const MOVES = {
  buyer: [
    ["submitted", "We sent it to the listing agent"],
    ["counter_received", "Seller countered"],
    ["countered", "We countered back"],
    ["accepted", "Seller accepted"],
    ["rejected", "Seller rejected"],
    ["withdrawn", "We withdrew it"],
  ],
  seller: [
    ["countered", "We countered"],
    ["counter_received", "Buyer countered back"],
    ["accepted", "Seller accepted"],
    ["rejected", "Seller rejected"],
    ["withdrawn", "Buyer withdrew"],
  ],
} as const;

export function OfferMoves({ offerId, side, status, amount }: { offerId: string; side: "buyer" | "seller"; status: string; amount: number }) {
  const moves = MOVES[side].filter(([k]) => !(k === "submitted" && status !== "draft"));
  const [kind, setKind] = useState<string>(moves[0][0]);
  const counter = kind === "countered" || kind === "counter_received";
  return (
    <ActionForm action={offerMove} className="flex flex-col gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="offer_id" value={offerId} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">What happened?</span>
            <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
              {moves.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {counter && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Counter price</span>
              <input name="amount" type="number" inputMode="numeric" required min={1} step={1} defaultValue={amount} className={input} />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Note <span className="text-xs">(optional)</span></span>
            <input name="note" maxLength={2000} placeholder={counter ? "e.g. Also asking for a 7-day inspection period" : "Anything worth remembering"} className={input} />
          </label>
          <button disabled={pending} className={`${primaryBtn} self-start`}>{pending ? "Saving…" : "Log it"}</button>
        </>
      )}
    </ActionForm>
  );
}

export function OfferNote({ offerId }: { offerId: string }) {
  return (
    <ActionForm action={offerMove} className="flex flex-wrap items-start gap-2">
      {(pending) => (
        <>
          <input type="hidden" name="offer_id" value={offerId} />
          <input type="hidden" name="kind" value="note" />
          <input name="note" required maxLength={2000} placeholder="Add a note" aria-label="Note" className={`${inputAuto} min-w-48 flex-1`} />
          <button disabled={pending} className={primaryBtn}>{pending ? "…" : "Add"}</button>
        </>
      )}
    </ActionForm>
  );
}
