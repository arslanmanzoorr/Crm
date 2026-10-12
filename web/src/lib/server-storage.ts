// Server-only file reads with the Supabase service-role key, for routes that serve files to visitors who have no
// session (client portal documents, Zillow feed photos). Callers MUST check access first (portal_document,
// rental_feed_photo); this skips RLS. Never import from a client component: the key would ship to browsers.

export const SERVICE_KEY_MISSING = "Set SUPABASE_SERVICE_ROLE_KEY on the server to serve shared files.";

export async function serverDownload(bucket: "documents" | "listing-photos", path: string): Promise<Response | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const safe = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${safe}`, { headers: { apikey: key, authorization: `Bearer ${key}` }, cache: "no-store" });
  return res.ok ? res : null;
}
