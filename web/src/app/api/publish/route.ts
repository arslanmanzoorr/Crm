import { getProperty } from "@/lib/db";

// Hands the post to an n8n workflow, which fans it out to each platform's API.
export async function POST(req: Request) {
  const url = process.env.N8N_PUBLISH_WEBHOOK_URL;
  if (!url) return Response.json({ error: "Set N8N_PUBLISH_WEBHOOK_URL in web/.env.local to publish." }, { status: 503 });
  const body = await req.text();
  if (body.length > 100_000) return Response.json({ error: "Post is too large." }, { status: 413 });
  let parsed: { property?: { id?: unknown } };
  try {
    parsed = JSON.parse(body);
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  // The listing must be one of this team's and approved by a broker (checked server-side, not trusted from the client).
  const id = parsed.property?.id;
  const listing = typeof id === "string" ? await getProperty(id) : undefined;
  if (!listing) return Response.json({ error: "Listing not found." }, { status: 404 });
  if (listing.approved === false) return Response.json({ error: "This listing is waiting for broker approval." }, { status: 403 });
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return Response.json({ error: `n8n responded ${res.status}` }, { status: 502 });
  return Response.json({ ok: true });
}
