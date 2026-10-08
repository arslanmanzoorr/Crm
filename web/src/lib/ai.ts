/** Calls the server AI route; throws with a user-readable message on failure. */
export async function askAi(task: "analyze" | "reply" | "caption", data: unknown): Promise<string> {
  const res = await fetch("/api/ai", { method: "POST", body: JSON.stringify({ task, data }) });
  const json = await res.json().catch(() => ({ error: `AI request failed (${res.status})` }));
  if (!res.ok) throw new Error(json.error);
  return json.text;
}
