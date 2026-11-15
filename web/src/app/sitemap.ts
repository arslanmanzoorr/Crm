import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";
import { PUBLIC_PAGES, SITE } from "@/lib/seo";

const updated = new Date(LEGAL.updated);

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({
    url: `${SITE}${p.path}`,
    lastModified: p.path.startsWith("/legal") ? updated : new Date(),
    changeFrequency: p.change,
    priority: p.priority,
    ...(p.path === "/welcome" ? { images: [`${SITE}/site/s-leads.png`, `${SITE}/site/s-today.png`] } : {}),
  }));
}
