import { readUnsubToken } from "@/lib/email";
import { unsubscribe } from "@/lib/email-server";

// One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe header. No page, no questions.
export async function POST(_: Request, { params }: RouteContext<"/api/email/unsubscribe/[token]">) {
  const secret = process.env.EMAIL_TOKEN_SECRET;
  const id = secret ? readUnsubToken((await params).token, secret) : null;
  if (!id) return new Response("Invalid link", { status: 400 });
  await unsubscribe(id);
  return new Response("Unsubscribed");
}
