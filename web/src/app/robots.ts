import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// Public pages are open to search engines and to AI search and assistant crawlers (that's how Estos shows up in
// ChatGPT, Claude, Perplexity and Google's AI answers). Everything behind sign-in, every client link that carries a
// secret, and the APIs stay out.
const PRIVATE = ["/api/", "/f/", "/oh/", "/p/", "/tc/", "/u/", "/invite", "/agency-invite", "/accept", "/mfa", "/oauth/", "/auth/"];
// Pages plus what it takes to render them (scripts, styles, images, icons, share cards).
const PUBLIC = ["/welcome", "/pricing", "/store", "/legal", "/login", "/llms.txt", "/llms-full.txt", "/site/", "/_next/", "/opengraph-image", "/twitter-image", "/apple-icon", "/favicon.ico", "/icons/", "/manifest.webmanifest"];
const AI = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "Bingbot", "DuckAssistBot", "MistralAI-User", "Amazonbot", "meta-externalagent"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/$", ...PUBLIC], disallow: ["/", ...PRIVATE] },
      { userAgent: AI, allow: ["/$", ...PUBLIC], disallow: ["/", ...PRIVATE] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
