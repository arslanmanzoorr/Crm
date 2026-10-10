// One AI call through OpenRouter (OpenAI-compatible chat API). The key stays on the server.
// Model is configurable; default is the same Claude model the app was built against.

export const AI_KEY_MISSING = "Set OPENROUTER_API_KEY in web/.env.local to enable AI.";

export class AiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function chat(o: { system: string; user: string; maxTokens: number; schema?: { name: string; schema: object } }): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiError(AI_KEY_MISSING, 503);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`, "content-type": "application/json",
      ...(process.env.SITE_URL && { "http-referer": process.env.SITE_URL }), "x-title": "EstateOS",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-opus-5.5",
      max_tokens: o.maxTokens,
      messages: [{ role: "system", content: o.system }, { role: "user", content: o.user }],
      ...(o.schema && { response_format: { type: "json_schema", json_schema: { name: o.schema.name, strict: true, schema: o.schema.schema } } }),
    }),
    signal: AbortSignal.timeout(60_000),
  }).catch((e: Error) => { throw new AiError(e.name === "TimeoutError" ? "AI took too long, try again." : "Couldn't reach the AI service.", 502); });
  const body = await res.json().catch(() => null) as { choices?: { message?: { content?: string; refusal?: string }; finish_reason?: string }[]; error?: { message?: string } } | null;
  if (res.status === 401 || res.status === 403) throw new AiError("OPENROUTER_API_KEY is invalid.", 503);
  if (res.status === 402) throw new AiError("The OpenRouter account is out of credits.", 503);
  if (res.status === 429) throw new AiError("AI is busy, try again in a moment.", 429);
  if (!res.ok || !body?.choices?.[0]) throw new AiError(body?.error?.message ?? `AI error (${res.status}).`, 502);
  const c = body.choices[0];
  if (c.message?.refusal || c.finish_reason === "refusal" || c.finish_reason === "content_filter") throw new AiError("The AI declined this request.", 422);
  return (c.message?.content ?? "").trim();
}
