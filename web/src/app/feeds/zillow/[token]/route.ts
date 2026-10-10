import { connection } from "next/server";
import { supabase } from "@/lib/db";
import { feedXml, type FeedData } from "@/lib/rental-feed";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** The team's Zillow Rental Network feed. Public URL, but useless without the secret token in it. */
export async function GET(_: Request, ctx: RouteContext<"/feeds/zillow/[token]">) {
  await connection();
  const { token } = await ctx.params;
  const key = process.env.FORM_RPC_KEY, site = process.env.SITE_URL;
  if (!TOKEN.test(token) || !key || !site) return new Response("Not found", { status: 404 });
  const { data, error } = await (await supabase()).rpc("rental_feed", { p_key: key, p_token: token });
  if (error) return new Response("Feed unavailable", { status: 503 });
  if (!data) return new Response("Not found", { status: 404 });
  const xml = feedXml(data as FeedData, (m) => `${site}/feeds/zillow/${token}/photo/${m}`);
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
