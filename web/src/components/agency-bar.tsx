"use client";

import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { bare } from "./sidebar";

/** Shown while agency staff work inside a client's sub-account, so it's always clear whose data this is. */
export function AgencyBar({ agency, team }: { agency: string; team: string }) {
  const path = usePathname();
  if (bare(path) || path.startsWith("/agency")) return null;
  return (
    <div data-agency-bar className="fixed inset-x-0 top-0 z-30 flex h-9 items-center justify-center gap-3 border-b border-line/10 bg-surface-1/95 px-4 text-xs backdrop-blur md:left-24">
      <Building2 aria-hidden className="size-3.5 shrink-0 text-accent-ink" />
      <span className="min-w-0 truncate"><span className="text-muted">{agency} ·</span> working in <span className="font-medium">{team}</span></span>
      <Link href="/agency" className="flex shrink-0 items-center gap-1 font-medium text-accent-ink hover:underline"><ArrowLeft aria-hidden className="size-3.5" /> Agency</Link>
    </div>
  );
}
