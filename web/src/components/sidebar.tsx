"use client";

import { Calculator, CalendarDays, ChartColumn, CircleUserRound, Clapperboard, Handshake, HeartHandshake, Home, Inbox, LayoutGrid, Menu, Search, Send, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette, openPalette } from "./command-palette";

const nav = [
  { label: "Today", href: "/", icon: LayoutGrid, phone: true },
  { label: "Leads", href: "/leads", icon: Users, phone: true },
  { label: "Listings", href: "/properties", icon: Home, phone: true },
  { label: "Showings", href: "/showings", icon: CalendarDays, phone: false },
  { label: "Deals", href: "/deals", icon: Handshake, phone: true },
  { label: "Inbox", href: "/inbox", icon: Inbox, phone: true },
  { label: "Clients", href: "/clients", icon: HeartHandshake, phone: false },
  { label: "Analytics", href: "/analytics", icon: ChartColumn, phone: false },
  { label: "Calculators", href: "/tools", icon: Calculator, phone: false },
  { label: "Studio", href: "/studio", icon: Clapperboard, phone: false },
  { label: "Publish", href: "/publish", icon: Send, phone: false },
];

function Item({ href, label, icon: Icon, active, className = "" }: { href: string; label: string; icon: typeof Home; active: boolean; className?: string }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`group flex min-w-14 flex-col items-center gap-1 rounded-2xl py-1 text-[11px] font-medium ${active ? "text-ink" : "text-muted hover:text-ink"} ${className}`}>
      <span className={`grid h-8 w-12 place-items-center rounded-full transition duration-200 ${active ? "bg-surface-light text-on-light" : "group-hover:bg-surface-2"}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      {label}
    </Link>
  );
}

/** Labeled navigation: a bottom bar with the four daily destinations on phones, a full rail on wider screens. */
export function Sidebar() {
  const path = usePathname();
  if (path === "/login" || path.startsWith("/legal") || path.startsWith("/f/") || path.startsWith("/oh/")) return null;
  const isActive = (href: string) => (href === "/" ? path === "/" : href === "/leads" ? path.startsWith("/leads") || path.startsWith("/pipeline") : path.startsWith(href));
  const moreActive = path.startsWith("/account") || path.startsWith("/tools") || path.startsWith("/showings") || path.startsWith("/clients") || path.startsWith("/analytics") || path.startsWith("/studio") || path.startsWith("/publish");
  return (
    <>
    <CommandPalette />
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/5 bg-bg/95 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur md:sticky md:top-0 md:h-screen md:w-24 md:flex-col md:justify-start md:gap-2 md:border-0 md:bg-transparent md:py-6"
    >
      <Link href="/" aria-label="EstateOS home" className="mx-auto mb-6 hidden size-11 place-items-center rounded-full bg-accent text-lg font-semibold text-on-light md:grid">
        E
      </Link>
      <button type="button" onClick={openPalette} title="Search (⌘K or /)" className="group mb-2 hidden min-w-14 flex-col items-center gap-1 rounded-2xl py-1 text-[11px] font-medium text-muted hover:text-ink md:flex">
        <span className="grid h-8 w-12 place-items-center rounded-full bg-surface-2 transition duration-200 group-hover:bg-surface-3">
          <Search aria-hidden className="size-5" />
        </span>
        Search
      </button>
      {nav.map((n) => (
        <Item key={n.href} {...n} active={isActive(n.href)} className={n.phone ? "" : "hidden md:flex"} />
      ))}
      <Item href="/account" label="More" icon={Menu} active={moreActive} className="md:hidden" />
      <Item href="/account" label="Account" icon={CircleUserRound} active={path.startsWith("/account")} className="hidden md:mt-auto md:flex" />
    </nav>
    </>
  );
}
