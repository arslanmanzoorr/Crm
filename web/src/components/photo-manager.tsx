"use client";

import { createBrowserClient } from "@supabase/ssr";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { confirmPhotos, deletePhoto, photoUploadUrls, setCoverPhoto } from "@/lib/actions";

const MAX_EDGE = 2560;
const THUMB_EDGE = 800;
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

/**
 * Re-encode in the browser before upload: right-side-up, at most 2560px, WebP.
 * Re-encoding drops all metadata, including the GPS position phones embed in photos.
 */
async function prepare(file: File): Promise<{ full: Blob; thumb: Blob }> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
  if (file.size > MAX_INPUT_BYTES) throw new Error(`${file.name} is over 40 MB.`);
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const encode = async (edge: number, quality: number) => {
    const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (!blob) throw new Error(`Couldn't process ${file.name}.`);
    return blob;
  };
  try {
    return { full: await encode(MAX_EDGE, 0.86), thumb: await encode(THUMB_EDGE, 0.8) };
  } finally {
    bmp.close();
  }
}

/** Runs tasks with at most `n` in flight. */
async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

export function PhotoManager({ propertyId, photos }: { propertyId: string; photos: { id: string; url: string }[] }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ error?: boolean; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  async function upload(list: FileList | File[]) {
    const files = [...list].filter((f) => f.type.startsWith("image/"));
    if (!files.length || progress) return;
    setMsg(null);
    setProgress({ done: 0, total: files.length });
    const errors: string[] = [];
    const uploaded: string[] = [];
    try {
      const slots = await photoUploadUrls(propertyId, files.length);
      if (slots.length < files.length) errors.push(`Only ${slots.length} more photos fit on this listing.`);
      const storage = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!).storage.from("listing-photos");
      await pool(files.slice(0, slots.length).map((file, i) => ({ file, slot: slots[i] })), 3, async ({ file, slot }) => {
        try {
          const { full, thumb } = await prepare(file);
          const [a, b] = await Promise.all([
            storage.uploadToSignedUrl(slot.path, slot.token, full, { contentType: "image/webp" }),
            storage.uploadToSignedUrl(slot.thumbPath, slot.thumbToken, thumb, { contentType: "image/webp" }),
          ]);
          const error = a.error ?? b.error;
          if (error) throw new Error(`${file.name}: ${error.message}`);
          uploaded.push(slot.path);
        } catch (e) {
          errors.push((e as Error).message);
        } finally {
          setProgress((p) => p && { ...p, done: p.done + 1 });
        }
      });
      if (uploaded.length) await confirmPhotos(propertyId, uploaded);
    } catch (e) {
      errors.push((e as Error).message);
    }
    setProgress(null);
    setMsg(errors.length
      ? { error: true, text: `${uploaded.length ? `Added ${uploaded.length}. ` : ""}${errors.slice(0, 3).join(" ")}` }
      : { text: `Added ${uploaded.length} photo${uploaded.length === 1 ? "" : "s"}.` });
  }

  const [cover, ...rest] = photos;
  const busy = !!progress || pending;

  return (
    <section aria-labelledby="photos" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="photos" className="text-xl">Photos <span className="text-sm text-muted">{photos.length}/40</span></h2>
        {photos.length > 1 && <p className="hidden text-xs text-muted sm:block">The first photo is the cover on cards, videos and posts.</p>}
      </div>

      {cover && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[cover, ...rest].map((ph, i) => (
            <figure key={ph.id} className={`group relative overflow-hidden rounded-[18px] bg-surface-2 ${i === 0 ? "col-span-2 row-span-2" : "aspect-[4/3]"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, already resized on upload */}
              <img src={ph.url} alt={i === 0 ? "Cover photo" : `Photo ${i + 1}`} loading={i < 3 ? "eager" : "lazy"} className="size-full animate-rise object-cover" />
              {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-bg/80 px-2.5 py-1 text-xs backdrop-blur">Cover</span>}
              <figcaption className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                {i > 0 && (
                  <button type="button" disabled={busy} onClick={() => start(() => setCoverPhoto(ph.id))} className="flex min-h-11 items-center gap-1.5 rounded-full bg-bg/85 px-3 text-xs backdrop-blur hover:text-accent">
                    <Star aria-hidden className="size-3.5" /> Make cover
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  aria-label={armed === ph.id ? `Confirm remove ${i === 0 ? "cover photo" : `photo ${i + 1}`}` : `Remove ${i === 0 ? "cover photo" : `photo ${i + 1}`}`}
                  onClick={() => (armed === ph.id ? start(async () => { await deletePhoto(ph.id); setArmed(null); }) : setArmed(ph.id))}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs backdrop-blur transition ${armed === ph.id ? "bg-score-1 font-medium text-on-light" : "bg-bg/85 hover:text-score-1"}`}
                >
                  <Trash2 aria-hidden className="size-3.5" /> {armed === ph.id ? "Remove?" : ""}
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed p-6 text-center text-sm transition has-[:focus-visible]:border-accent ${dragging ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:border-accent hover:text-accent"} ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <ImagePlus aria-hidden className="size-7" />
        {progress
          ? <span>Uploading {progress.done} of {progress.total}…</span>
          : <span>{photos.length ? "Add more photos" : "Add listing photos"} · drop them here or tap to choose<br /><span className="text-xs">Resized and stripped of location data before upload</span></span>}
        <input type="file" accept="image/*" multiple disabled={busy} className="sr-only" onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }} />
        {progress && (
          <span role="progressbar" aria-label="Upload progress" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total} className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-surface-3">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </span>
        )}
      </label>
      {msg && <p role="status" className={`animate-rise text-sm ${msg.error ? "text-score-1" : "text-accent"}`}>{msg.text}</p>}
    </section>
  );
}
