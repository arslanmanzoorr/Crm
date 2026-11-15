import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, SITE } from "@/lib/seo";

// lastmod is the date the page's copy last changed (lib/seo.ts), never the request time: search engines stop
// trusting a lastmod that changes on every fetch.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({
    url: `${SITE}${p.path}`,
    lastModified: p.updated,
    ...(p.path === "/welcome" ? { images: [`${SITE}/site/s-leads.png`, `${SITE}/site/s-today.png`, `${SITE}/site/s-lead.png`] } : {}),
  }));
}
