"use client";

import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/data";

const SIZE = 1080;
const KINDS = ["Just listed", "Open house", "Price improved", "Under contract", "Just sold"] as const;

/**
 * A square post for Instagram/Facebook, drawn in the browser (listing photos are WebP, which the server-side
 * image renderer can't read). Brand colors and the app font; the agent's name in the corner.
 */
export function SocialGraphic({ photo, address, area, price, beds, baths, agent, initial }: {
  photo?: string; address: string; area: string; price: number; beds: number; baths: number; agent: string; initial: (typeof KINDS)[number];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [kind, setKind] = useState<(typeof KINDS)[number]>(initial);
  const key = `${kind}|${photo}|${address}|${price}`;
  const [drawn, setDrawn] = useState<string | null>(null);
  const ready = drawn === key;

  useEffect(() => {
    let live = true;
    const draw = async () => {
      const c = canvas.current!, g = c.getContext("2d")!;
      const font = getComputedStyle(document.body).fontFamily;
      await document.fonts.ready;
      g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, SIZE, SIZE);
      if (photo) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = photo;
        try { await img.decode(); } catch { /* draw without the photo */ }
        if (!live) return;
        if (img.naturalWidth) {
          const s = Math.max(SIZE / img.naturalWidth, 780 / img.naturalHeight);
          const w = img.naturalWidth * s, h = img.naturalHeight * s;
          g.save(); g.beginPath(); g.rect(0, 0, SIZE, 780); g.clip();
          g.drawImage(img, (SIZE - w) / 2, (780 - h) / 2, w, h); g.restore();
        }
      }
      // Badge
      g.font = `600 44px ${font}`;
      const bw = g.measureText(kind.toUpperCase()).width + 64;
      g.fillStyle = "#c5f36a"; g.beginPath(); g.roundRect(48, 48, bw, 84, 42); g.fill();
      g.fillStyle = "#111111"; g.textBaseline = "middle"; g.fillText(kind.toUpperCase(), 80, 92);
      // Details band
      g.fillStyle = "#1a1a1a"; g.fillRect(0, 780, SIZE, 300);
      g.fillStyle = "#f5f5f5"; g.textBaseline = "alphabetic";
      g.font = `300 64px ${font}`; fit(g, address, 64, 860, 600);
      g.fillStyle = "#a3a3a3"; g.font = `400 36px ${font}`;
      g.fillText([area, `${beds} bd · ${baths} ba`].filter(Boolean).join("  ·  "), 64, 920);
      g.fillStyle = "#c5f36a"; g.font = `600 64px ${font}`; g.textAlign = "right";
      g.fillText(kind === "Just sold" || kind === "Under contract" ? "" : money(price), SIZE - 64, 860);
      g.fillStyle = "#a3a3a3"; g.font = `400 32px ${font}`; g.fillText(agent, SIZE - 64, 1020);
      g.textAlign = "left"; g.font = `400 24px ${font}`; g.fillText("Equal Housing Opportunity", 64, 1020);
      setDrawn(key);
    };
    draw();
    return () => { live = false; };
  }, [photo, address, area, price, beds, baths, agent, kind, key]);

  const save = () => canvas.current!.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `${kind.toLowerCase().replaceAll(" ", "-")}-${address.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, "image/png");

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Post type" className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={`min-h-10 rounded-full px-3.5 text-sm ${kind === k ? "bg-accent font-medium text-on-light" : "bg-surface-3 hover:bg-surface-1"}`}>{k}</button>
        ))}
      </div>
      <canvas ref={canvas} width={SIZE} height={SIZE} role="img" aria-label={`${kind} post for ${address}`} className="aspect-square w-full max-w-sm rounded-2xl" />
      <button type="button" disabled={!ready} onClick={save} className="flex min-h-11 w-fit items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3 disabled:opacity-60">
        <Download aria-hidden className="size-4" /> Download image
      </button>
    </div>
  );
}

/** Shrinks the font until the text fits `max` pixels wide. */
function fit(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number) {
  let size = 64;
  while (size > 32 && g.measureText(text).width > max) { size -= 4; g.font = g.font.replace(/\d+px/, `${size}px`); }
  g.fillText(text, x, y, max);
}
