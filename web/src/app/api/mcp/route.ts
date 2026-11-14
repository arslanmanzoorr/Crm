import { createClient } from "@supabase/supabase-js";
import { handle, ToolError, type Reply } from "@/lib/mcp";
import { allow } from "@/lib/rate-limit";

// Streamable HTTP MCP endpoint, stateless JSON. Auth is the caller's own: a personal token (estos_…) or an OAuth
// access token from Estos sign-in. Either way the database runs every tool as that person, under RLS.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const PAT = /^estos_[0-9a-f]{64}$/;
const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;

const cors = {
  "access-control-allow-origin": "*", // bearer tokens only, never cookies, so any origin is safe
  "access-control-allow-methods": "POST, GET, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, mcp-protocol-version, mcp-session-id, last-event-id",
  "access-control-expose-headers": "www-authenticate, mcp-session-id",
};

function unauthorized(req: Request, message: string) {
  const meta = `${new URL(req.url).origin}/.well-known/oauth-protected-resource/api/mcp`;
  return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message } }, {
    status: 401, headers: { ...cors, "www-authenticate": `Bearer resource_metadata="${meta}"` },
  });
}

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? "";
  if (!PAT.test(bearer) && !JWT.test(bearer)) return unauthorized(req, "Connect with Estos sign-in, or send a personal token as: Authorization: Bearer estos_…");
  if (!allow(`mcp:${bearer.slice(-24)}`, 120, 60_000)) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Rate limit: 120 requests a minute." } }, { status: 429, headers: { ...cors, "retry-after": "60" } });
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 200_000) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, { status: 413, headers: cors });
    body = JSON.parse(text);
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: cors });
  }

  const pat = PAT.test(bearer);
  const db = createClient(SB_URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: pat ? {} : { headers: { authorization: `Bearer ${bearer}` } },
  });
  let denied: string | null = null;
  const rpc = async (tool: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc("mcp", { p_token: pat ? bearer : null, p_tool: tool, p_args: args });
    if (!error) return data;
    // Bad, expired or revoked credentials, or no team access: the client must sign in again.
    if (error.code === "28000" || error.code === "PGRST301" || error.code === "PGRST303" || /jwt/i.test(error.message)) {
      denied = error.message.replace(/^mcp: /, "");
      throw new ToolError(denied);
    }
    // Our own messages and the database's validation (check constraints, bad input) go back to the model to fix.
    if (error.message.startsWith("mcp: ")) throw new ToolError(error.message.slice(5));
    if (["23514", "22P02", "22007", "22008", "23502", "22001", "42501"].includes(error.code ?? "")) throw new ToolError(error.message);
    console.error("mcp rpc", tool, error.code, error.message);
    throw new ToolError("Estos couldn't do that just now. Try again.");
  };

  // Who is calling, and may they make changes? Also proves the credential before anything else runs.
  let scope: "read" | "write";
  try {
    const me = (await rpc("whoami", {})) as { access?: string } | null;
    if (!me) return unauthorized(req, "No team access. Open Estos and finish signing in.");
    scope = me.access === "read" ? "read" : "write";
  } catch (e) {
    return unauthorized(req, e instanceof Error ? e.message : "Sign in again.");
  }

  const msgs = Array.isArray(body) ? body : [body];
  const replies: Reply[] = [];
  for (const m of msgs.slice(0, 20)) {
    try {
      const r = await handle(m as Parameters<typeof handle>[0], { scope, rpc });
      if (denied) return unauthorized(req, denied);
      if (r) replies.push(r);
    } catch (e) {
      console.error("mcp", e);
      replies.push({ jsonrpc: "2.0", id: (m as { id?: string | number })?.id ?? null, error: { code: -32603, message: "Internal error" } });
    }
  }
  if (!replies.length) return new Response(null, { status: 202, headers: cors });
  return Response.json(Array.isArray(body) ? replies : replies[0], { headers: { ...cors, "cache-control": "no-store" } });
}

// Stateless server: no event stream to resume and no session to end.
export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { ...cors, allow: "POST, OPTIONS" } });
}
export const DELETE = GET;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...cors, "access-control-max-age": "86400" } });
}
