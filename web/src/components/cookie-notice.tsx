"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "estos:cookie-notice";
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return true; } };
const subscribe = (cb: () => void) => { addEventListener("storage", cb); addEventListener(KEY, cb); return () => { removeEventListener("storage", cb); removeEventListener(KEY, cb); }; };

/**
 * Notice, not a consent wall: the site sets only essential sign-in cookies and loads no trackers, so there is nothing
 * to accept or refuse. If non-essential cookies are ever added, this must become a real opt-in that blocks them first.
 */
export function CookieNotice() {
  const seen = useSyncExternalStore(subscribe, read, () => true);
  if (seen) return null;
  return (
    <div role="region" aria-label="Cookie notice" className="fixed inset-x-3 bottom-3 z-50 flex flex-wrap items-center gap-3 rounded-2xl bg-[#111111] p-4 text-sm text-white shadow-xl sm:right-auto sm:left-4 sm:max-w-md">
      <p className="min-w-0 flex-1">We use only the cookies needed to sign you in and keep Estos secure. No ads, analytics or tracking. <Link href="/legal/privacy" className="underline">Privacy Policy</Link></p>
      <button type="button" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} dispatchEvent(new Event(KEY)); }} className="min-h-11 rounded-full bg-white px-5 font-medium text-[#111111]">OK</button>
    </div>
  );
}
