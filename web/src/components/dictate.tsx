"use client";

import { Mic } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";

type Rec = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: (e: { error: string }) => void; start: () => void; stop: () => void };
type RecCtor = new () => Rec;
const ctor = () => (typeof window === "undefined" ? undefined : ((window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: RecCtor }).webkitSpeechRecognition));

/** Speak instead of type, using the browser's own speech recognition (Chrome, Edge, Safari). Hidden where unsupported. */
export function Dictate({ onText, label }: { onText: (text: string) => void; label: string }) {
  const supported = useSyncExternalStore(() => () => {}, () => !!ctor(), () => false);
  const rec = useRef<Rec | null>(null);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!supported) return null;
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    const R = ctor()!;
    const r = new R();
    r.lang = navigator.language || "en-US";
    r.interimResults = true;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(" ").trim());
    r.onend = () => setOn(false);
    r.onerror = (e) => { setOn(false); setErr(e.error === "not-allowed" ? "Allow the microphone to talk instead of type." : null); };
    rec.current = r; setErr(null); setOn(true); r.start();
  };
  return (
    <>
      <button type="button" onClick={toggle} aria-label={on ? "Stop listening" : label} aria-pressed={on} title={err ?? (on ? "Listening… tap to stop" : label)}
        className={`grid size-11 shrink-0 place-items-center rounded-full ${on ? "bg-accent text-on-light" : "bg-surface-3 hover:bg-surface-1"}`}>
        <Mic aria-hidden className={`size-4 ${on ? "animate-pulse" : ""}`} />
      </button>
      {err && <span role="alert" className="sr-only">{err}</span>}
    </>
  );
}
