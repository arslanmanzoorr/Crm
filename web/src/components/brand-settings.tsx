"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import { removeLogo, setBranding, setFeatures, uploadLogo } from "@/lib/actions";
import { brandColorError } from "@/lib/brand";
import { FEATURES, RADII, THEMES, type Radius, type Theme } from "@/lib/features";
import { DARK_VARS, LIGHT_VARS, RADIUS } from "@/lib/theme";
import { primaryBtn } from "./forms";

const DEFAULT = "#c5f36a";
const PRESETS = ["#c5f36a", "#7dd3fc", "#5eead4", "#fcd34d", "#fdba74", "#fda4af", "#c4b5fd", "#f5f5f5"];
const SHAPES: Record<Radius, string> = { pill: "Pill", rounded: "Rounded", square: "Square" };
const ICON: Record<Radius, string> = { pill: "9999px", rounded: "6px", square: "1px" };

export const THEME_LABEL: Record<Theme, string> = { dark: "Dark", light: "Light", system: "Match device" };
const subscribeScheme = (cb: () => void) => { const m = matchMedia("(prefers-color-scheme: light)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };

type Msg = { error?: string; ok?: string } | null;
const Note = ({ msg }: { msg: Msg }) => (msg?.error ? <span role="alert" className="text-score-1">{msg.error}</span> : msg?.ok ? <span role="status" className="text-muted">{msg.ok}</span> : null);

/** The team's look across the whole CRM and its client-facing pages: logo, accent, button shape, "Powered by". */
export function BrandSettings({ color, hide, radius, logo, team, theme }: { color: string | null; hide: boolean; radius: Radius; logo: string | null; team: string; theme: Theme }) {
  const [c, setC] = useState(color ?? DEFAULT);
  const [h, setH] = useState(hide);
  const [r, setR] = useState<Radius>(radius);
  const [t, setT] = useState<Theme>(theme);
  const prefersLight = useSyncExternalStore(subscribeScheme, () => matchMedia("(prefers-color-scheme: light)").matches, () => false);
  const lightPreview = t === "light" || (t === "system" && prefersLight);
  const [msg, setMsg] = useState<Msg>(null);
  const [logoMsg, setLogoMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const [uploading, startUpload] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const warn = brandColorError(c);
  const preview = { ...(lightPreview ? LIGHT_VARS : DARK_VARS), "--color-accent": warn ? DEFAULT : c, "--radius-btn": RADIUS[r].btn, "--radius-card": RADIUS[r].card, colorScheme: lightPreview ? "light" : "dark" } as CSSProperties;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6 rounded-card bg-surface-2 p-5 text-sm">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-medium">Logo</legend>
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-surface-light text-xl font-semibold text-on-light">
              {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL */}
              {logo ? <img src={logo} alt={`${team} logo`} className="size-full object-contain p-1.5" /> : team[0]?.toUpperCase()}
            </span>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="logo-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData();
                fd.set("logo", f);
                startUpload(async () => { setLogoMsg((await uploadLogo(fd)) ?? null); if (file.current) file.current.value = ""; });
              }} />
            <label htmlFor="logo-file" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface-3 px-4 font-medium hover:bg-surface-light hover:text-on-light">
              <ImageUp aria-hidden className="size-4" /> {uploading ? "Uploading…" : logo ? "Replace" : "Upload logo"}
            </label>
            {logo && (
              <button type="button" disabled={uploading} onClick={() => startUpload(async () => setLogoMsg((await removeLogo()) ?? null))}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-muted hover:text-ink">
                <Trash2 aria-hidden className="size-4" /> Remove
              </button>
            )}
          </div>
          <p className="text-muted">PNG, JPG or WebP up to 512 KB. A square logo on a transparent background looks best.</p>
          <Note msg={logoMsg} />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-medium">Accent color</legend>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-label={`Use ${p}`} aria-pressed={c === p} onClick={() => setC(p)}
                className={`size-9 rounded-[50%] ring-offset-2 ring-offset-surface-2 ${c === p ? "ring-2 ring-ink" : ""}`} style={{ background: p }} />
            ))}
            <label className="ml-1 inline-flex items-center gap-2 text-muted">
              <input type="color" value={c} onChange={(e) => setC(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg bg-transparent" />
              Custom
            </label>
          </div>
          {warn && <p className="text-score-1">{warn}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-medium">Button shape</legend>
          <div className="flex flex-wrap gap-2">
            {RADII.map((k) => (
              <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 ${r === k ? "border-ink" : "border-line/10 hover:border-line/30"}`}>
                <input type="radio" name="radius" value={k} checked={r === k} onChange={() => setR(k)} className="accent-[var(--color-accent)]" />
                <span aria-hidden className="h-5 w-9 border-2 border-current" style={{ borderRadius: ICON[k] }} />
                {SHAPES[k]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-medium">Theme</legend>
          <p className="text-muted">The team default. Each person can still pick their own under Account.</p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((k) => (
              <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 ${t === k ? "border-ink" : "border-line/10 hover:border-line/30"}`}>
                <input type="radio" name="theme" value={k} checked={t === k} onChange={() => setT(k)} className="accent-[var(--color-accent)]" />
                {THEME_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={h} onChange={(e) => setH(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
          Hide &ldquo;Powered by Estos&rdquo; on client pages
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={pending || !!warn} className={`${primaryBtn} w-fit`}
            onClick={() => start(async () => setMsg((await setBranding(c === DEFAULT ? null : c, h, r, t)) ?? null))}>{pending ? "Saving…" : "Save branding"}</button>
          <Note msg={msg} />
        </div>
      </div>

      <figure style={preview} aria-label="Preview" className="flex flex-col gap-3 self-start rounded-card bg-bg p-5 text-ink ring-1 ring-line/10">
        <figcaption className="text-xs font-medium tracking-wide text-muted uppercase">Preview</figcaption>
        <div className="flex items-center gap-3">
          <span className={`grid size-10 place-items-center overflow-hidden rounded-full font-semibold text-on-light ${logo ? "bg-surface-light" : "bg-accent"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL */}
            {logo ? <img src={logo} alt="" className="size-full object-contain p-1" /> : team[0]?.toUpperCase()}
          </span>
          <span className="font-medium">{team}</span>
        </div>
        <div className="flex flex-col gap-2 rounded-card bg-surface-2 p-4">
          <span className="font-medium">Maya Okonkwo</span>
          <span className="text-sm text-muted">Toured 2 homes · ready this month</span>
          <div className="mt-2 flex gap-2">
            <button type="button" tabIndex={-1} className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-on-light">Call now</button>
            <button type="button" tabIndex={-1} className="min-h-10 rounded-full bg-surface-3 px-4 text-sm">Text</button>
          </div>
        </div>
        <span className="text-sm text-accent-ink">Accent text and links</span>
      </figure>
    </div>
  );
}

/** Switch whole modules off for the team: hidden from the menu and search, and closed if someone opens the link. */
export function FeatureSettings({ off }: { off: string[] }) {
  const [o, setO] = useState(new Set(off));
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const toggle = (k: string) => setO((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-2 p-5 text-sm">
      <ul className="grid gap-2 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const on = !o.has(f.key);
          return (
            <li key={f.key}>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface-3/60 px-4 hover:bg-surface-3">
                <span className={on ? "" : "text-muted"}>{f.label}</span>
                <input type="checkbox" role="switch" checked={on} onChange={() => toggle(f.key)} className="peer sr-only" />
                <span aria-hidden className="relative h-6 w-10 shrink-0 rounded-full bg-surface-1 transition peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-muted after:transition peer-checked:after:translate-x-4 peer-checked:after:bg-on-light" />
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} className={`${primaryBtn} w-fit`} onClick={() => start(async () => setMsg((await setFeatures([...o])) ?? null))}>{pending ? "Saving…" : "Save modules"}</button>
        <Note msg={msg} />
      </div>
    </div>
  );
}
