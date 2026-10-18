import { supabase } from "@/lib/db";
import { safeFileName } from "@/lib/docs";
import { toCsv, ZipWriter } from "@/lib/zip";

// "Download everything": the active team's complete history as one zip, owners and admins only. Each table comes as
// CSV (opens in any spreadsheet) and JSON (exact, for moving to another system); the change history is included;
// documents and listing photos are added when asked. Every export is logged and limited in the database.
// Table -> column to page by (a stable order). Secrets (tokens, hashes, keys) never leave: those tables are left out
// and any token/hash column on the rest is dropped.
const TABLES = {
  contacts: "created_at", activities: "ts", tasks: "created_at", properties: "created_at", property_media: "created_at",
  property_events: "ts", lead_forms: "created_at", memberships: "created_at", invites: "created_at", offices: "created_at",
  territories: "created_at", open_houses: "created_at", open_house_visits: "ts", showings: "created_at", deals: "created_at",
  deal_milestones: "id", deal_links: "created_at", offers: "created_at", offer_events: "ts", financing: "updated_at",
  favorites: "created_at", portal_links: "created_at", cmas: "created_at", contact_links: "created_at", owned_homes: "updated_at",
  testimonials: "created_at", partners: "created_at", expenses: "created_at", documents: "created_at", doc_templates: "updated_at",
  workflows: "created_at", workflow_runs: "created_at", suppressions: "created_at", privacy_requests: "created_at",
  ai_usage: "ts", audit_log: "ts",
} as const;
const PAGE = 1000; // PostgREST's default row cap per request
const SECRET = /token|hash|secret/i;
const clean = (rows: Record<string, unknown>[]) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !SECRET.test(k))));

export async function GET(req: Request) {
  const db = await supabase();
  const [{ data: auth }, org] = await Promise.all([db.auth.getUser(), db.rpc("active_org")]);
  if (!auth.user || !org.data) return new Response("Sign in first.", { status: 401 });
  const files = new URL(req.url).searchParams.get("files") === "1";
  // Checks owner/admin, writes the audit entry and enforces 5 exports per person per hour.
  const { data: allowed } = await db.rpc("log_export", { p_files: files });
  if (!allowed) return new Response("Only owners and admins can export, up to 5 times an hour. Try again later.", { status: 403 });

  const orgId = org.data as string;
  const zip = new ZipWriter();
  const day = new Date().toISOString().slice(0, 10);
  const counts: string[] = [];

  const stream = new ReadableStream<Uint8Array>({
    async start(c) {
      try {
        const { data: team } = await db.from("organizations").select("*").eq("id", orgId).single();
        c.enqueue(zip.add("team.json", JSON.stringify(clean(team ? [team] : [])[0] ?? {}, null, 2)));
        const docs: { id: string; name: string; path: string }[] = [];
        const photos: { property_id: string; path: string }[] = [];
        for (const [table, by] of Object.entries(TABLES)) {
          const rows: Record<string, unknown>[] = [];
          for (let from = 0; ; from += PAGE) {
            const { data, error } = await db.from(table).select("*").eq("org_id", orgId).order(by).range(from, from + PAGE - 1);
            if (error) throw new Error(`Export failed on ${table}.`);
            rows.push(...data);
            if (data.length < PAGE) break;
          }
          const safe = clean(rows);
          if (table === "documents") docs.push(...(rows as typeof docs));
          if (table === "property_media") photos.push(...(rows as typeof photos));
          counts.push(`${table}: ${rows.length}`);
          c.enqueue(zip.add(`json/${table}.json`, JSON.stringify(safe, null, 2)));
          if (safe.length) c.enqueue(zip.add(`csv/${table}.csv`, toCsv(safe)));
        }
        let missing = 0;
        if (files) {
          for (const d of docs) {
            const { data } = await db.storage.from("documents").download(d.path);
            if (data) c.enqueue(zip.add(`files/documents/${d.id.slice(0, 8)}-${safeFileName(d.name)}`, new Uint8Array(await data.arrayBuffer())));
            else missing++;
          }
          for (const p of photos) {
            const { data } = await db.storage.from("listing-photos").download(p.path);
            if (data) c.enqueue(zip.add(`files/listing-photos/${p.property_id}/${p.path.split("/").pop()}`, new Uint8Array(await data.arrayBuffer())));
            else missing++;
          }
        }
        c.enqueue(zip.add("README.txt", readme(day, counts, files, missing)));
        c.enqueue(zip.finish());
        c.close();
      } catch (e) {
        c.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="estateos-export-${day}.zip"`,
      "cache-control": "no-store",
    },
  });
}

const readme = (day: string, counts: string[], files: boolean, missing: number) => `EstateOS export, ${day}

This is your team's complete data. It is yours: keep it, back it up, or import it anywhere.

csv/    One spreadsheet per table. Opens in Excel, Google Sheets or Numbers, and imports into most CRMs.
json/   The same data, exact (dates, lists, nested fields), for moving to another system.
team.json  Your team settings.
${files ? `files/  Deal and client documents, and listing photos.${missing ? ` ${missing} file(s) could not be read and are not included.` : ""}\n` : "files/  Not included. Tick \"Include documents and photos\" to add them.\n"}
Full history: every note, call, text and email logged (activities), every task, and the change log of leads,
listings and tasks (audit_log), with no caps.
Not included, on purpose: passwords, API keys, private link tokens and connected-account credentials.

Rows per table:
${counts.join("\n")}
`;
