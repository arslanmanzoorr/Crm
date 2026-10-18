import type { MetadataRoute } from "next";

// Installable app: home-screen icon, opens full screen like a native app, straight into Today.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EstateOS",
    short_name: "EstateOS",
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
