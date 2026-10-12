import { connection } from "next/server";
import { supabase } from "@/lib/db";
import { serverDownload } from "@/lib/server-storage";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** One listing photo for Zillow. Served only while the listing is in this feed; the URL never changes for a photo. */
export async function GET(_: Request, ctx: RouteContext<"/feeds/zillow/[token]/photo/[media]">) {
  await connection();
  const { token, media } = await ctx.params;
  const key = process.env.FORM_RPC_KEY;
  if (!TOKEN.test(token) || !UUID.test(media) || !key) return new Response("Not found", { status: 404 });
  const db = await supabase();
  const { data: path } = await db.rpc("rental_feed_photo", { p_key: key, p_token: token, p_media: media });
  if (typeof path !== "string") return new Response("Not found", { status: 404 });
  // Access was checked by rental_feed_photo (server key + feed token + listing in this feed); read server-side.
  const res = await serverDownload("listing-photos", path);
  if (!res) return new Response("Not found", { status: process.env.SUPABASE_SERVICE_ROLE_KEY ? 404 : 503 });
  const file = await res.blob();
  return new Response(file, { headers: { "content-type": file.type || "image/webp", "cache-control": "public, max-age=86400", "x-robots-tag": "noindex" } });
}
