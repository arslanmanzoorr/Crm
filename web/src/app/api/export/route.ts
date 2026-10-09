import { supabase } from "@/lib/db";

// Full copy of the active team's data (privacy rights / portability). Owners and admins only:
// agents can read every lead in the app, but a one-click dump of the whole book is an admin power.
// Table -> column to page by (a stable order).
const TABLES = {
  contacts: "created_at", activities: "ts", tasks: "created_at", properties: "created_at", property_media: "created_at",
  lead_forms: "created_at", memberships: "created_at", open_houses: "created_at", open_house_visits: "ts", deals: "created_at",
  deal_milestones: "id", offers: "created_at", offer_events: "ts", testimonials: "created_at",
} as const;
const PAGE = 1000; // PostgREST's default row cap per request

export async function GET() {
  const db = await supabase();
  const [{ data: auth }, org] = await Promise.all([db.auth.getUser(), db.rpc("active_org")]);
  if (!auth.user || !org.data) return Response.json({ error: "Sign in first." }, { status: 401 });

  const { data: me } = await db.from("memberships").select("role").eq("org_id", org.data).eq("user_id", auth.user.id).single();
  if (me?.role !== "owner" && me?.role !== "admin") return Response.json({ error: "Only owners and admins can export." }, { status: 403 });

  const out: Record<string, unknown[]> = {};
  for (const [table, by] of Object.entries(TABLES)) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db.from(table).select("*").eq("org_id", org.data).order(by).range(from, from + PAGE - 1);
      if (error) return Response.json({ error: `Export failed on ${table}.` }, { status: 500 });
      rows.push(...data);
      if (data.length < PAGE) break;
    }
    out[table] = rows;
  }

  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), org_id: org.data, ...out }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="estateos-export-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
