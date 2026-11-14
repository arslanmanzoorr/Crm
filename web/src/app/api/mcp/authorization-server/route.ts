// Some MCP clients look for authorization server metadata on the resource's own origin. Pass Supabase Auth's
// (the real authorization server) through unchanged; 404 while the OAuth server is switched off.
import { connection } from "next/server";

export async function GET() {
  await connection(); // per request, never baked in at build time
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`).catch(() => null);
  if (!res?.ok) return Response.json({ error: "OAuth sign-in is not enabled. Use a personal token from Account → Connect your AI." }, { status: 404 });
  return Response.json(await res.json(), { headers: { "access-control-allow-origin": "*", "cache-control": "public, max-age=3600" } });
}
