// OAuth 2.0 Protected Resource Metadata (RFC 9728) for /api/mcp, served at /.well-known/oauth-protected-resource
// (see the rewrites in next.config.ts). Tells MCP clients that Estos sign-in (Supabase Auth) issues the tokens.
export function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return Response.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Estos",
    resource_documentation: `${origin}/account/ai`,
  }, { headers: { "access-control-allow-origin": "*", "cache-control": "public, max-age=3600" } });
}
