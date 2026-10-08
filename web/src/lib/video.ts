export const SLIDE_SECONDS = 3;
export const END_CARD_SECONDS = 2.5;

export const ASPECTS = {
  "9:16": [720, 1280],
  "1:1": [1080, 1080],
  "16:9": [1280, 720],
} as const;
export type Aspect = keyof typeof ASPECTS;

/** Which photo shows at time t, and how far through it we are (0–1). null = end card. */
export function slideAt(t: number, count: number) {
  const index = Math.floor(t / SLIDE_SECONDS);
  if (index >= count) return null;
  return { index, progress: (t % SLIDE_SECONDS) / SLIDE_SECONDS };
}

/** Rect that covers a w×h canvas with an iw×ih image at the given zoom, panned by `pan` (-1..1) horizontally. */
export function coverRect(iw: number, ih: number, w: number, h: number, zoom: number, pan: number) {
  const s = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * s;
  const dh = ih * s;
  return { x: (w - dw) / 2 + ((dw - w) / 2) * pan, y: (h - dh) / 2, w: dw, h: dh };
}
