import { verifyWebhook } from "@/lib/email";
import { recordEvent } from "@/lib/email-server";

// Resend delivery events (delivered, opened, clicked, bounced, complained), signed with RESEND_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const body = await req.text();
  if (!secret || body.length > 100_000) return new Response("Not configured", { status: 400 });
  const h = req.headers;
  if (!verifyWebhook(secret, h.get("svix-id") ?? "", h.get("svix-timestamp") ?? "", body, h.get("svix-signature") ?? "")) return new Response("Bad signature", { status: 401 });
  const e = JSON.parse(body) as { type?: string; data?: { email_id?: string } };
  if (e.type && e.data?.email_id) await recordEvent(e.type, e.data.email_id);
  return new Response("ok");
}
