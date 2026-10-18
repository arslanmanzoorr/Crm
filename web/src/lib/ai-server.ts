// One AI call through OpenRouter (OpenAI-compatible chat API). The key stays on the server.
// Model is configurable (OPENROUTER_MODEL); default is the cheapest Claude model (Haiku).

export const AI_KEY_MISSING = "Set OPENROUTER_API_KEY in web/.env.local to enable AI.";

export class AiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

type Body = { choices?: { message?: { content?: string; refusal?: string }; finish_reason?: string }[]; error?: { message?: string } } | null;

/** The JSON object in a model's reply, tolerating ```json fences or a sentence around it. */
export function extractJson(text: string): string {
  const t = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = t.indexOf("{"), end = t.lastIndexOf("}");
  return start >= 0 && end > start ? t.slice(start, end + 1) : t;
}

/** One chat call. With `image` (a data: URL) it goes to the vision model (OPENROUTER_VISION_MODEL). With `pdf`, OpenRouter
 *  extracts the document's text first (file-parser plugin, free "pdf-text" engine), so any text model can read it. */
export async function chat(o: { system: string; user: string; maxTokens: number; schema?: { name: string; schema: object }; image?: string; pdf?: { name: string; data: string } }): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiError(AI_KEY_MISSING, 503);
  // The schema also goes in the prompt, so models without enforced structured output (most free ones) still answer in shape.
  const system = o.schema ? `${o.system}\n\nReply with only a JSON object matching this schema, no other text:\n${JSON.stringify(o.schema.schema)}` : o.system;
  const send = (structured: boolean) => fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`, "content-type": "application/json",
      ...(process.env.SITE_URL && { "http-referer": process.env.SITE_URL }), "x-title": "EstateOS",
    },
    body: JSON.stringify({
      model: o.image ? process.env.OPENROUTER_VISION_MODEL || "google/gemma-3-12b-it" : process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-5.5",
      max_tokens: o.maxTokens,
      // Thinking off: these are short tasks, and reasoning models (DeepSeek, Nemotron) otherwise spend the whole
      // budget thinking and return nothing. Models without reasoning ignore it.
      reasoning: { enabled: false },
      messages: [{ role: "system", content: system }, { role: "user", content:
        o.image ? [{ type: "text", text: o.user }, { type: "image_url", image_url: { url: o.image } }]
        : o.pdf ? [{ type: "text", text: o.user }, { type: "file", file: { filename: o.pdf.name, file_data: o.pdf.data } }]
        : o.user }],
      ...(o.pdf && { plugins: [{ id: "file-parser", pdf: { engine: "pdf-text" } }] }),
      ...(structured && o.schema && { response_format: { type: "json_schema", json_schema: { name: o.schema.name, strict: true, schema: o.schema.schema } } }),
    }),
    signal: AbortSignal.timeout(o.pdf ? 120_000 : 60_000),
  }).catch((e: Error) => { throw new AiError(e.name === "TimeoutError" ? "AI took too long, try again." : "Couldn't reach the AI service.", 502); });

  let res = await send(!!o.schema);
  // Model can't do enforced structured output: ask again without it and rely on the prompt.
  if (o.schema && (res.status === 400 || res.status === 404)) res = await send(false);
  const body = await res.json().catch(() => null) as Body;
  if (res.status === 401 || res.status === 403) throw new AiError("OPENROUTER_API_KEY is invalid.", 503);
  if (res.status === 402) throw new AiError("The OpenRouter account is out of credits.", 503);
  if (res.status === 429) throw new AiError("AI is busy, try again in a moment.", 429);
  if (!res.ok || !body?.choices?.[0]) throw new AiError(body?.error?.message ?? `AI error (${res.status}).`, 502);
  const c = body.choices[0];
  if (c.message?.refusal || c.finish_reason === "refusal" || c.finish_reason === "content_filter") throw new AiError("The AI declined this request.", 422);
  const text = (c.message?.content ?? "").trim();
  if (!text) throw new AiError(c.finish_reason === "length" ? "The AI ran out of room before answering. Try again, or pick a different model." : "The AI returned an empty answer. Try again.", 502);
  return o.schema ? extractJson(text) : text;
}
