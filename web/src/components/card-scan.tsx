"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { scanCard, type CardScan } from "@/lib/actions";

/** Downscale a photo to ≤1280px JPEG in the browser, under the 1 MB server action limit. */
async function shrink(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  let q = 0.85, url = c.toDataURL("image/jpeg", q);
  while (url.length > 900_000 && q > 0.4) url = c.toDataURL("image/jpeg", (q -= 0.15));
  return url;
}

/** "Scan a business card": photo → AI reads it → fills the lead form. Consent is never inferred from a card. */
export function CardScanButton({ onRead }: { onRead: (card: CardScan) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setMsg(null);
    try {
      const r = await scanCard(await shrink(f));
      if ("error" in r) setMsg(r);
      else {
        onRead(r);
        const extra = [r.title, r.company, r.website].filter(Boolean).join(" · ");
        setMsg({ ok: `Filled from the card. Check it before saving${extra ? `. Also on the card: ${extra}` : ""}. Contact consent stays off: a card isn't permission to call or text.` });
      }
    } catch { setMsg({ error: "Couldn't open that photo." }); } finally { setBusy(false); if (file.current) file.current.value = ""; }
  };
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} aria-hidden tabIndex={-1} />
      <button type="button" disabled={busy} onClick={() => file.current?.click()} className="flex min-h-10 w-fit items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60">
        <Camera aria-hidden className="size-4" />{busy ? "Reading card…" : "Scan a business card"}
      </button>
      {msg?.error && <p role="alert" className="text-sm text-score-1">{msg.error}</p>}
      {msg?.ok && <p role="status" className="text-sm text-muted">{msg.ok}</p>}
    </div>
  );
}
