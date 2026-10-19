import { timingSafeEqual } from "node:crypto";
import { dispatchQueued } from "@/lib/email-server";

// Sends queued email. Called every minute by the database scheduler (x-dispatch-secret = EMAIL_DISPATCH_SECRET),
// or by a Vercel cron (Authorization: Bearer CRON_SECRET). Anything else gets 401.
const same = (a: string | null | undefined, b: string | undefined) => !!a && !!b && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function run(req: Request) {
  const ok = same(req.headers.get("x-dispatch-secret"), process.env.EMAIL_DISPATCH_SECRET)
    || same(req.headers.get("authorization"), process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined);
  if (!ok) return new Response("Unauthorized", { status: 401 });
  return Response.json(await dispatchQueued(), { headers: { "cache-control": "no-store" } });
}

export const POST = run;
export const GET = run;
