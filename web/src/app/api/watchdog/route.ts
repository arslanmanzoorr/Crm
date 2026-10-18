import { getWaitingLeads } from "@/lib/db";

// Polled every minute by the app's watchdog. Same rows the Today page shows, read with the caller's session.
export async function GET() {
  return Response.json(await getWaitingLeads(), { headers: { "cache-control": "no-store" } });
}
