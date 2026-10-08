"use client";

import { Clapperboard, Download, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ASPECTS, END_CARD_SECONDS, SLIDE_SECONDS, coverRect, slideAt, type Aspect } from "@/lib/video";

type Photo = { url: string; img: HTMLImageElement };

const field = "min-h-11 w-full rounded-full bg-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent";

function loadImage(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  return img.decode().then(() => ({ url, img }));
}

export function Studio({ defaults }: { defaults: { title: string; subtitle: string; agentName: string } }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [title, setTitle] = useState(defaults.title);
  const [subtitle, setSubtitle] = useState(defaults.subtitle);
  const [cta, setCta] = useState(`DM ${defaults.agentName.split(" ")[0]} to book a showing`);
  const [rendering, setRendering] = useState(false);
  const [video, setVideo] = useState<{ url: string; ext: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const loaded = await Promise.all([...files].filter((f) => f.type.startsWith("image/")).map(loadImage));
    setPhotos((p) => [...p, ...loaded]);
  }

  function draw(ctx: CanvasRenderingContext2D, t: number) {
    const [w, h] = ASPECTS[aspect];

    const s = slideAt(t, photos.length);
    ctx.fillStyle = "#0e0e0e";
    ctx.fillRect(0, 0, w, h);
    const unit = Math.min(w, h) / 20;

    if (s) {
      const { img } = photos[s.index];
      const r = coverRect(img.naturalWidth, img.naturalHeight, w, h, 1 + 0.12 * s.progress, s.index % 2 ? 1 - 2 * s.progress : 2 * s.progress - 1);
      ctx.globalAlpha = Math.min(1, s.progress * SLIDE_SECONDS * 3); // quick fade-in per photo
      ctx.drawImage(img, r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
      const g = ctx.createLinearGradient(0, h * 0.6, 0, h);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
      ctx.fillStyle = "#c5f36a";
      ctx.font = `600 ${unit * 1.4}px Urbanist, sans-serif`;
      ctx.fillText(title, unit, h - unit * 3, w - unit * 2);
      ctx.fillStyle = "#f5f5f5";
      ctx.font = `400 ${unit}px Urbanist, sans-serif`;
      ctx.fillText(subtitle, unit, h - unit * 1.5, w - unit * 2);
    } else {
      ctx.textAlign = "center";
      ctx.fillStyle = "#c5f36a";
      ctx.font = `600 ${unit * 1.6}px Urbanist, sans-serif`;
      ctx.fillText(cta, w / 2, h / 2, w - unit * 2);
      ctx.fillStyle = "#a3a3a3";
      ctx.font = `400 ${unit}px Urbanist, sans-serif`;
      ctx.fillText(defaults.agentName, w / 2, h / 2 + unit * 2);
      ctx.textAlign = "start";
    }
  }

  function render() {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m))!;
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: type, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      setVideo({ url: URL.createObjectURL(new Blob(chunks, { type })), ext: type.startsWith("video/mp4") ? "mp4" : "webm" });
      setRendering(false);
    };

    // shortcut: renders in real time (≈3s per photo); move to a server render (Remotion/FFmpeg) for AI clips + voiceover.
    const total = photos.length * SLIDE_SECONDS + END_CARD_SECONDS;
    const start = performance.now();
    setRendering(true);
    setVideo(null);
    rec.start();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      draw(ctx, Math.min(t, total));
      setProgress(Math.min(100, Math.round((t / total) * 100)));
      if (t < total) requestAnimationFrame(tick);
      else rec.stop();
    };
    tick();
  }

  const [w, h] = ASPECTS[aspect];

  // Live preview: show the first frame whenever photos, format or text change (not while recording).
  useEffect(() => {
    if (rendering || !canvas.current) return;
    const ctx = canvas.current.getContext("2d")!;
    if (photos.length) draw(ctx, SLIDE_SECONDS * 0.4);
    else ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draw reads exactly these values
  }, [photos, aspect, title, subtitle, cta, rendering]);

  // Live preview: show the first frame whenever photos, format or text change (not while recording).
  useEffect(() => {
    if (rendering || !canvas.current) return;
    const ctx = canvas.current.getContext("2d")!;
    if (photos.length) draw(ctx, SLIDE_SECONDS * 0.4);
    else ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draw reads exactly these values
  }, [photos, aspect, title, subtitle, cta, rendering]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-light">Video Studio</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-white/10 p-8 text-muted transition hover:border-accent hover:text-accent has-[:focus-visible]:border-accent has-[:focus-visible]:text-accent">
            <ImagePlus aria-hidden className="size-8" />
            <span className="text-sm">Add listing photos · they play in the order you add them</span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
          </label>

          {photos.length > 0 && (
            <ol className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((p, i) => (
                <li key={p.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-2xl object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => setPhotos(photos.filter((x) => x !== p))}
                    className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-bg/80 hover:text-accent"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div role="radiogroup" aria-label="Aspect ratio" className="flex gap-2">
            {(Object.keys(ASPECTS) as Aspect[]).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={aspect === a}
                onClick={() => setAspect(a)}
                className={`min-h-11 rounded-full px-4 text-sm ${aspect === a ? "bg-surface-light text-on-light" : "bg-surface-2 hover:text-accent"}`}
              >
                {a}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Headline</span>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Just Listed · 14 Oak Ave" maxLength={60} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Details line</span>
            <input className={field} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="$635,000 · 3 bd · 2 ba · Westside" maxLength={80} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">End card</span>
            <input className={field} value={cta} onChange={(e) => setCta(e.target.value)} placeholder="DM me to book a showing" maxLength={60} />
          </label>

          <button
            type="button"
            onClick={render}
            disabled={!photos.length || rendering}
            className="flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-on-light hover:bg-accent-strong disabled:opacity-50"
          >
            <Clapperboard className="size-4" />
            {rendering ? `Recording… ${progress}%` : photos.length ? `Render ${photos.length * SLIDE_SECONDS + END_CARD_SECONDS}s video` : "Add photos to render"}
          </button>
        </div>

        <div className="relative flex flex-col items-center gap-3">
          {rendering && (
            <div role="progressbar" aria-label="Rendering video" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          )}
          {!photos.length && !video && <p className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-6 text-center text-sm text-muted">Preview appears here once you add photos</p>}
          <canvas ref={canvas} width={w} height={h} hidden={!!video} className="max-h-[70vh] w-full rounded-card bg-surface-1 object-contain" style={{ aspectRatio: `${w}/${h}` }} />
          {video && (
            <>
              <video src={video.url} controls className="max-h-[70vh] rounded-card" style={{ aspectRatio: `${w}/${h}` }} />
              <a href={video.url} download={`listing.${video.ext}`} className="flex items-center gap-2 rounded-full bg-surface-light px-5 py-2.5 font-medium text-on-light hover:bg-white">
                <Download className="size-4" /> Download
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
