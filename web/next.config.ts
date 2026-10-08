import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Listing photos upload straight to Supabase Storage (signed URLs) and display from signed URLs.
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";

// No third-party scripts, frames or form targets. The browser only talks to our origin, plus Supabase Storage
// for photo bytes; all data and AI calls are server-side.
// ponytail: 'unsafe-inline' scripts because Next streams inline RSC payloads; move to nonces if a strict CSP audit requires it.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${storage}`.trim(),
  "media-src 'self' blob:",
  "font-src 'self'",
  `connect-src 'self' ${storage}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // Public lead forms (/f/<id>) may be embedded in an agent's own website; everything else may not be framed.
    const embeddable = securityHeaders
      .filter((h) => h.key !== "X-Frame-Options")
      .map((h) => (h.key === "Content-Security-Policy" ? { ...h, value: h.value.replace("frame-ancestors 'none'", "frame-ancestors *") } : h));
    return [
      { source: "/((?!f/).*)", headers: securityHeaders },
      { source: "/f/:path*", headers: embeddable },
    ];
  },
};

export default nextConfig;
