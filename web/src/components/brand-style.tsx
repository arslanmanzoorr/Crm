import { Suspense } from "react";
import { supabase } from "@/lib/db";

/** The team's white-label accent and "Powered by" choice on a client-facing page. Renders nothing for the default look. */
export function BrandStyle({ kind, id }: { kind: "form" | "oh" | "portal"; id: Promise<string> }) {
  return <Suspense fallback={null}><Inner kind={kind} id={id} /></Suspense>;
}

async function Inner({ kind, id }: { kind: string; id: Promise<string> }) {
  const { data } = await (await supabase()).rpc("public_brand", { p_kind: kind, p_id: await id });
  const b = data as { color: string | null; hide: boolean } | null;
  // The DB only stores #rrggbb, so the color is safe to put in CSS.
  const color = b?.color && /^#[0-9a-f]{6}$/.test(b.color) ? b.color : null;
  if (!color && !b?.hide) return null;
  return <style>{`${color ? `:root{--color-accent:${color};--color-accent-strong:${color}}` : ""}${b?.hide ? ".powered{display:none}" : ""}`}</style>;
}
