import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getDomainBrand } from "@/lib/db";

// Installable app: home-screen icon, opens full screen like a native app, straight into Today.
// On an agency's own domain it installs under the agency's name.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = ((await headers()).get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  const name = (await getDomainBrand(host))?.name ?? "EstateOS";
  return {
    name,
    short_name: name.slice(0, 12),
    description: "Leads, follow-ups, listings and deals, with AI that drafts the work.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0e0e",
    theme_color: "#0e0e0e",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New lead", url: "/leads/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Leads", url: "/leads", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
