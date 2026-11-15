import { llmsTxt } from "@/lib/seo";

// llms.txt: a short Markdown brief for AI models (llmstxt.org).
export function GET() {
  return new Response(llmsTxt(false), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
