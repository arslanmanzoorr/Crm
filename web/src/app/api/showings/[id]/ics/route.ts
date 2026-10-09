import { getShowing } from "@/lib/db";
import { ics } from "@/lib/showings";

/** The showing as a calendar file (Google, Apple, Outlook). Read through the caller's RLS, so only their team's. */
export async function GET(_: Request, ctx: RouteContext<"/api/showings/[id]/ics">) {
  const s = await getShowing((await ctx.params).id);
  if (!s) return Response.json({ error: "Not found" }, { status: 404 });
  const body = ics({
    uid: s.id, startsAt: s.startsAt, endsAt: s.endsAt,
    title: `Showing: ${s.address} with ${s.contact.name}`,
    location: s.address,
    description: [s.contact.phone && `Buyer: ${s.contact.name}, ${s.contact.phone}`, s.showingNotes && `Instructions: ${s.showingNotes}`, s.notes].filter(Boolean).join("\n"),
  });
  return new Response(body, {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="showing-${s.id.slice(0, 8)}.ics"`, "cache-control": "no-store" },
  });
}
