"use client";

import { listingNote, PROMO_LABEL, type Promo } from "@/lib/farm";
import { FarmNote } from "./farm-note";
import { useNow } from "./header";

/** Renders after mount so the open house time is in the agent's own time zone. */
export function ListingPromo({ kind, p, agent, whenIso, due }: {
  kind: Promo; p: Parameters<typeof listingNote>[1]; agent: string; whenIso?: string; due: { id: string; name: string; email: boolean }[];
}) {
  const now = useNow();
  if (!now) return <div className="h-40 rounded-card bg-surface-3" />;
  const when = whenIso && new Date(whenIso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <FarmNote key={kind} label={PROMO_LABEL[kind]} draft={listingNote(kind, p, agent, when || undefined)} due={due} />;
}
