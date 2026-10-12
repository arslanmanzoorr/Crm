import { connection } from "next/server";
import { supabase } from "@/lib/db";
import { SERVICE_KEY_MISSING, serverDownload } from "@/lib/server-storage";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** A document the agent shared with this client. Checked against the portal link every time; never cached. */
export async function GET(_: Request, ctx: RouteContext<"/p/[token]/doc/[id]">) {
  await connection();
  const { token, id } = await ctx.params;
  if (!TOKEN.test(token) || !UUID.test(id)) return new Response("Not found", { status: 404 });
  const db = await supabase();
  const { data } = await db.rpc("portal_document", { p_token: token, p_doc: id });
  const doc = data as { path: string; name: string; mime: string } | null;
  if (!doc) return new Response("Not found", { status: 404 });
  // Access was checked by portal_document (token + this client's shared documents); read the file server-side.
  const res = await serverDownload("documents", doc.path);
  if (!res) return new Response(process.env.SUPABASE_SERVICE_ROLE_KEY ? "Not found" : SERVICE_KEY_MISSING, { status: process.env.SUPABASE_SERVICE_ROLE_KEY ? 404 : 503 });
  const file = await res.blob();
  const ascii = doc.name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  return new Response(file, {
    headers: {
      "content-type": doc.mime || "application/octet-stream",
      "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      "cache-control": "no-store", "x-robots-tag": "noindex", "x-content-type-options": "nosniff",
    },
  });
}
