import { ImageResponse } from "next/og";
import { TAGLINE } from "@/lib/seo";
import { S } from "@/lib/site-theme";

// The card shown when an Estos link is shared (Slack, iMessage, X, LinkedIn) and in AI answers that show previews.
export const alt = `Estos: ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: S.bg, color: S.ink }}>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: -2 }}>Estos<span style={{ color: S.accent }}>.</span></div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -6, lineHeight: 0.92 }}>Sell more.</div>
          <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -6, lineHeight: 0.92, color: S.accentDisplay }}>Type less.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "2px solid rgba(0,0,0,0.15)", paddingTop: 28, fontSize: 30, color: S.muted }}>
          <span>{TAGLINE}.</span>
          <span style={{ color: S.ink, fontWeight: 600 }}>estos.app</span>
        </div>
      </div>
    ),
    size,
  );
}
