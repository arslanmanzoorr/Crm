import { robotsTxt } from "@/lib/seo";

// Public pages are open to search engines and to AI search, assistant and training crawlers: the goal is for Estos to
// be found, cited and known by name. The app, the APIs and every client link that carries a secret stay out.
export function GET() {
  return new Response(robotsTxt(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
