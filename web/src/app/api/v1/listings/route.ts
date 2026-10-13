import { supabase } from "@/lib/db";
import { apiKey, badKey } from "@/lib/api-v1";

/** GET /api/v1/listings — every listing of the key's team, newest first. */
export async function GET(req: Request) {
  const key = apiKey(req);
  if (key instanceof Response) return key;
  const { data, error } = await (await supabase()).rpc("api_listings", { p_key: key });
  if (error) return Response.json({ error: "Server error" }, { status: 500 });
  return data === null ? badKey() : Response.json({ listings: data });
}
