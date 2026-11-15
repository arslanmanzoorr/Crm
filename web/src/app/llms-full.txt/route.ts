import { llmsTxt } from "@/lib/seo";

// The long version: every plan's features and every playbook in the store.
export function GET() {
  return new Response(llmsTxt(true), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
