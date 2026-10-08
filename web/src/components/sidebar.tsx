"use client";

import { Clapperboard, Home, Inbox, LayoutGrid, Send, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { label: "Workspace", href: "/", icon: LayoutGrid },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Properties", href: "/properties", icon: Home },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Video Studio", href: "/studio", icon: Clapperboard },
  { label: "Publish", href: "/publish", icon: Send },
];

const itemClass = (active: boolean) =>
  `grid size-11 shrink-0 place-items-center rounded-full transition duration-150 ${
    active ? "bg-surface-light text-on-light" : "bg-surface-2 text-muted hover:text-accent"
  }`;

export function Sidebar() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-white/5 bg-bg/90 px-2 py-2 backdrop-blur md:sticky md:top-0 md:h-screen md:w-20 md:flex-col md:justify-start md:gap-3 md:border-0 md:bg-transparent md:py-6"
    >
      <Link href="/" aria-label="EstateOS home" className="mb-6 hidden size-11 place-items-center rounded-full bg-accent text-lg font-semibold text-on-light md:grid">
        E
      </Link>
      {nav.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href} aria-label={label} title={label} aria-current={isActive(href) ? "page" : undefined} className={itemClass(isActive(href))}>
          <Icon className="size-5" />
        </Link>
      ))}
    </nav>
  );
}
