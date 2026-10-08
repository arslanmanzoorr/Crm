// Hands the post to an n8n workflow, which fans it out to each platform's API.
export async function POST(req: Request) {
  const url = process.env.N8N_PUBLISH_WEBHOOK_URL;
  if (!url) return Response.json({ error: "Set N8N_PUBLISH_WEBHOOK_URL in web/.env.local to publish." }, { status: 503 });
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: await req.text() });
  if (!res.ok) return Response.json({ error: `n8n responded ${res.status}` }, { status: 502 });
  return Response.json({ ok: true });
}
