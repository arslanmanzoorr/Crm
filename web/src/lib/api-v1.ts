// Shared bits for the public API (/api/v1). Keys are checked in the database (api_* functions); this only parses
// the header and rate-limits per key.
import { allow } from "./rate-limit";

const KEY = /^eos_[0-9a-f]{48}$/;

/** The API key from `Authorization: Bearer eos_…`, or an error Response. */
export function apiKey(req: Request): string | Response {
  const key = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? "";
  if (!KEY.test(key)) return Response.json({ error: "Send your API key as: Authorization: Bearer eos_…" }, { status: 401 });
  if (!allow(`api:${key.slice(-16)}`, 120, 60_000)) return Response.json({ error: "Rate limit: 120 requests a minute." }, { status: 429, headers: { "retry-after": "60" } });
  return key;
}

export const badKey = () => Response.json({ error: "Unknown or revoked API key." }, { status: 401 });
