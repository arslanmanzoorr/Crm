// Hands the post to an n8n workflow, which fans it out to each platform's API.
export async function POST(req: Request) {
  const url = process.env.N8N_PUBLISH_WEBHOOK_URL;
  if (!url) return Response.json({ error: "Set N8N_PUBLISH_WEBHOOK_URL in web/.env.local to publish." }, { status: 503 });
  const body = await req.text();
  if (body.length > 100_000) return Response.json({ error: "Post is too large." }, { status: 413 });
  try {
    JSON.parse(body);
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return Response.json({ error: `n8n responded ${res.status}` }, { status: 502 });
  return Response.json({ ok: true });
}
