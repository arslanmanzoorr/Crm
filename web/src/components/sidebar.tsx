"use client";

import { Building2, Calculator, CalendarDays, ChartColumn, CircleUserRound, Handshake, HeartHandshake, Home, Inbox, LayoutGrid, Menu, Search, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { featureFor } from "@/lib/features";
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
];

function Item({ href, label, icon: Icon, active, className = "" }: { href: string; label: string; icon: typeof Home; active: boolean; className?: string }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`group relative flex min-w-14 shrink-0 flex-col items-center gap-1 rounded-2xl py-1 text-[11px] font-medium ${active ? "text-ink" : "text-muted hover:text-ink"} ${className}`}>
      <span data-pill className={`grid h-8 w-12 place-items-center rounded-full transition duration-200 ${active ? "bg-surface-light text-on-light" : "group-hover:bg-surface-2"}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      {label}
    </Link>
  );
}

/** Pages shown without the app's navigation (sign-in, client-facing pages, marketing site, print views). */
export const bare = (path: string) => path === "/login" || path.startsWith("/u/") || path === "/mfa" || path === "/accept" || path.startsWith("/legal") || path.startsWith("/f/") || path.startsWith("/oh/") || path.startsWith("/p/") || path.startsWith("/tc/") || path.startsWith("/welcome") || path.startsWith("/store") || path.startsWith("/pricing") || path.endsWith("/print") || path.endsWith("/flyer");

/** Labeled navigation: a bottom bar with the four daily destinations on phones, a full rail on wider screens. */
export function Sidebar({ logo = null, team = "Estos", off = [], agency = false }: { logo?: string | null; team?: string; off?: readonly string[]; agency?: boolean }) {
  const path = usePathname();
  const navRef = useRef<HTMLElement>(null), pillRef = useRef<HTMLSpanElement>(null);
  // One highlight that slides to the active item (down the rail, or along the phone bar). The items keep their own
  // highlight until it has been placed, so the server render and no-JS view look the same.
  useLayoutEffect(() => {
    const nav = navRef.current, pill = pillRef.current;
    if (!nav || !pill) return;
    const place = () => {
      const target = [...nav.querySelectorAll<HTMLElement>("[aria-current=page] [data-pill]")].find((el) => el.offsetParent);
      if (!target) { pill.style.opacity = "0"; return; }
      const n = nav.getBoundingClientRect(), t = target.getBoundingClientRect();
      pill.style.transform = `translate(${t.left - n.left + nav.scrollLeft}px, ${t.top - n.top + nav.scrollTop}px)`;
      pill.style.width = `${t.width}px`;
      pill.style.height = `${t.height}px`;
      pill.style.opacity = "1";
      if (!nav.dataset.slide) requestAnimationFrame(() => { nav.dataset.slide = ""; });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [path]);
  if (bare(path)) return null;
  const isActive = (href: string) => (href === "/" ? path === "/" : href === "/leads" ? path.startsWith("/leads") || path.startsWith("/pipeline") : path.startsWith(href));
  const moreActive = path.startsWith("/account") || path.startsWith("/tools") || path.startsWith("/showings") || path.startsWith("/clients") || path.startsWith("/analytics") || path.startsWith("/studio") || path.startsWith("/publish");
  return (
    <>
    <CommandPalette off={off} />
    <nav
      ref={navRef}
      data-tour="nav"
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line/5 bg-bg/95 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur md:sticky md:top-0 md:h-screen md:w-24 md:overflow-y-auto md:flex-col md:justify-start md:gap-2 md:border-0 md:bg-transparent md:py-6"
    >
      <span ref={pillRef} aria-hidden className="nav-pill pointer-events-none absolute top-0 left-0 rounded-full bg-surface-light opacity-0" />
      <Link href="/" aria-label={`${team} home`} className={`mx-auto mb-6 hidden size-11 shrink-0 place-items-center overflow-hidden rounded-full text-lg font-semibold text-on-light md:grid ${logo ? "bg-surface-light" : "bg-accent"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- team logo from public Storage; next/image would need the host allow-listed */}
        {logo ? <img src={logo} alt="" className="size-full object-contain p-1" /> : (team[0] ?? "E").toUpperCase()}
      </Link>
      <button type="button" data-tour="search" onClick={openPalette} title="Search (⌘K or /)" className="group mb-2 hidden min-w-14 shrink-0 flex-col items-center gap-1 rounded-2xl py-1 text-[11px] font-medium text-muted hover:text-ink md:flex">
        <span className="grid h-8 w-12 place-items-center rounded-full bg-surface-2 transition duration-200 group-hover:bg-surface-3">
          <Search aria-hidden className="size-5" />
        </span>
        Search
      </button>
      {nav.filter((n) => !off.includes(featureFor(n.href) ?? "")).map((n) => (
        <Item key={n.href} {...n} active={isActive(n.href)} className={n.phone ? "" : "hidden md:flex"} />
      ))}
      <Item href="/account" label="More" icon={Menu} active={moreActive} className="md:hidden" />
      {agency && <Item href="/agency" label="Agency" icon={Building2} active={path.startsWith("/agency")} className="hidden md:mt-auto md:flex" />}
      <Item href="/account" label="Account" icon={CircleUserRound} active={path.startsWith("/account") || path.startsWith("/studio") || path.startsWith("/publish")} className={`hidden md:flex ${agency ? "" : "md:mt-auto"}`} />
    </nav>
    </>
  );
}
