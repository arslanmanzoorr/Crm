"use client";

import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { portalFavorite, portalMessage } from "@/lib/actions";
import { ActionForm, input, primaryBtn } from "./forms";

export function FavoriteButton({ token, propertyId, on, address }: { token: string; propertyId: string; on: boolean; address: string }) {
  const [fav, setFav] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <button type="button" aria-pressed={fav} aria-label={fav ? `Remove ${address} from saved homes` : `Save ${address}`}
      onClick={() => start(async () => { setFav(!fav); await portalFavorite(token, propertyId, !fav); })}
      className={`grid size-11 shrink-0 place-items-center rounded-full transition duration-200 ${fav ? "bg-accent text-on-light" : "bg-surface-3 hover:bg-surface-1"}`}>
      <Heart aria-hidden className="size-5" fill={fav ? "currentColor" : "none"} />
    </button>
  );
}

export function MessageAgent({ token }: { token: string }) {
  return (
    <ActionForm action={portalMessage.bind(null, token)} className="flex flex-col gap-2">
      {(pending) => (
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Message your agent</span>
            <textarea name="text" required rows={3} maxLength={2000} placeholder="Questions, times that work for a showing, anything" className={`${input} resize-y`} />
          </label>
          <button disabled={pending} className={`${primaryBtn} self-start`}>{pending ? "Sending…" : "Send"}</button>
        </>
      )}
    </ActionForm>
  );
}
