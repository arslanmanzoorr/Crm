"use client";

import { ArrowRight, Clapperboard, Home, Inbox, KanbanSquare, LayoutGrid, Plus, Search, Send, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { searchEverything, type SearchHit } from "@/lib/actions";

type Cmd = { id: string; title: string; sub: string; href: string; icon: typeof Home };

const COMMANDS: Cmd[] = [
  { id: "new-lead", title: "New lead", sub: "Add a buyer, seller or renter", href: "/leads/new", icon: Plus },
  { id: "import", title: "Import leads", sub: "From a CSV file", href: "/leads/import", icon: Users },
  { id: "new-listing", title: "New listing", sub: "Add a property", href: "/properties/new", icon: Plus },
  { id: "today", title: "Today", sub: "Workspace", href: "/", icon: LayoutGrid },
  { id: "leads", title: "Leads", sub: "All leads", href: "/leads", icon: Users },
  { id: "pipeline", title: "Pipeline", sub: "Leads by stage", href: "/pipeline", icon: KanbanSquare },
  { id: "listings", title: "Listings", sub: "All properties", href: "/properties", icon: Home },
  { id: "inbox", title: "Inbox", sub: "Conversations", href: "/inbox", icon: Inbox },
  { id: "studio", title: "Video Studio", sub: "Make a listing video", href: "/studio", icon: Clapperboard },
  { id: "publish", title: "Publish", sub: "Post to socials", href: "/publish", icon: Send },
  { id: "account", title: "Account", sub: "Profile and sign out", href: "/account", icon: UserRound },
];

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/** Open the palette from anywhere (e.g. a Search button). */
export const openPalette = () => window.dispatchEvent(new Event("estateos:palette"));

/** ⌘K / Ctrl+K or "/" anywhere: jump to any lead, listing or action. */
export function CommandPalette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);

  const open = useCallback(() => {
    if (dialog.current?.open) return;
    setQ("");
    setHits([]);
    setActive(0);
    dialog.current?.showModal();
    input.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      } else if (e.key === "/" && !isTyping(e.target) && !dialog.current?.open) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("estateos:palette", open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("estateos:palette", open);
    };
  }, [open]);

  // Debounced server search; drop responses that arrive after a newer query.
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const n = ++seq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchEverything(term);
        if (n === seq.current) setHits(res);
      } finally {
        if (n === seq.current) setSearching(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim().toLowerCase();
  const cmds = COMMANDS.filter((c) => !term || `${c.title} ${c.sub}`.toLowerCase().includes(term));
  const items = [...(term ? hits : []).map((h) => ({ ...h, icon: h.kind === "lead" ? UserRound : Home })), ...cmds];
  const sel = Math.min(active, Math.max(0, items.length - 1));

  function go(href: string) {
    dialog.current?.close();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((sel + 1) % Math.max(1, items.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((sel - 1 + items.length) % Math.max(1, items.length)); }
    else if (e.key === "Enter" && items[sel]) { e.preventDefault(); go(items[sel].href); }
  }

  useEffect(() => {
    document.getElementById(`${listId}-${sel}`)?.scrollIntoView({ block: "nearest" });
  }, [sel, listId]);

  return (
    <dialog
      ref={dialog}
      aria-label="Search and commands"
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
      className="palette fixed inset-x-0 top-[12vh] mx-auto w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-card bg-surface-2 p-0 text-ink shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
    >
      <div className="flex items-center gap-3 border-b border-white/5 px-4">
        <Search aria-hidden className={`size-5 shrink-0 ${searching ? "animate-pulse text-accent" : "text-muted"}`} />
        <input
          ref={input}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={items.length ? `${listId}-${sel}` : undefined}
          aria-autocomplete="list"
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); if (!e.target.value.trim()) setHits([]); }}
          onKeyDown={onKeyDown}
          placeholder="Search leads and listings, or type a command…"
          maxLength={80}
          className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
        <kbd className="hidden rounded-md bg-surface-3 px-1.5 py-0.5 text-xs text-muted sm:block">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Results" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <li
              key={`${"kind" in it ? it.kind : "cmd"}-${it.id}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === sel}
              onMouseMove={() => setActive(i)}
              onClick={() => go(it.href)}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3 ${i === sel ? "bg-surface-light text-on-light" : ""}`}
            >
              <Icon aria-hidden className={`size-4 shrink-0 ${i === sel ? "" : "text-muted"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{it.title}</span>
                <span className={`block truncate text-xs ${i === sel ? "text-on-light/70" : "text-muted"}`}>{it.sub}</span>
              </span>
              {i === sel && <ArrowRight aria-hidden className="size-4" />}
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">{searching ? "Searching…" : `Nothing matches “${q.trim()}”.`}</li>
        )}
      </ul>
      <p className="hidden border-t border-white/5 px-4 py-2 text-xs text-muted sm:block">↑ ↓ to move · Enter to open · ⌘K or / from anywhere</p>
    </dialog>
  );
}
