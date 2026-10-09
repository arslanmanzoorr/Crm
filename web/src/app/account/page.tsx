import { CalendarDays, ChartColumn, ChevronRight, Clapperboard, Download, HeartHandshake, LogOut, Send, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar, Reveal } from "@/components/ui";
import { signOut } from "@/lib/actions";
import { LeadFormSettings } from "@/components/lead-form-settings";
import { dbEnabled, getLeadForm, getMe } from "@/lib/db";

export const metadata: Metadata = { title: "Account" };

const row = "flex min-h-14 items-center gap-3 px-5 text-left hover:bg-surface-3";

export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-4xl font-light">Account</h1>
      <Suspense fallback={<div className="h-24 rounded-card bg-surface-2" />}>
        <Me />
      </Suspense>

      {dbEnabled && (
        <section aria-labelledby="capture" className="flex flex-col gap-2">
          <h2 id="capture" className="text-sm text-muted">Lead capture form</h2>
          <Suspense fallback={<div className="h-64 rounded-card bg-surface-2" />}>
            <Capture />
          </Suspense>
        </section>
      )}

      <section aria-labelledby="tools" className="flex flex-col gap-2">
        <h2 id="tools" className="text-sm text-muted">Team and tools</h2>
        <div className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          <Link href="/showings" className={`${row} md:hidden`}><CalendarDays aria-hidden className="size-5 text-muted" /><span className="flex-1">Showings</span><ChevronRight aria-hidden className="size-4 text-muted" /></Link>
          <Link href="/clients" className={`${row} md:hidden`}><HeartHandshake aria-hidden className="size-5 text-muted" /><span className="flex-1">Past clients</span><ChevronRight aria-hidden className="size-4 text-muted" /></Link>
          <Link href="/analytics" className={`${row} md:hidden`}><ChartColumn aria-hidden className="size-5 text-muted" /><span className="flex-1">Analytics</span><ChevronRight aria-hidden className="size-4 text-muted" /></Link>
          <Link href="/team" className={row}><Users aria-hidden className="size-5 text-muted" /><span className="flex-1">Team and invites</span><ChevronRight aria-hidden className="size-4 text-muted" /></Link>
          <Link href="/studio" className={row}><Clapperboard aria-hidden className="size-5 text-muted" /><span className="flex-1">Video Studio</span><ChevronRight aria-hidden className="size-4 text-muted" /></Link>
          <Link href="/publish" className={row}><Send aria-hidden className="size-5 text-muted" /><span className="flex-1">Publish to socials</span><ChevronRight aria-hidden className="size-4 text-muted" /></Link>
          {dbEnabled && (
            <a href="/api/export" download className={row}><Download aria-hidden className="size-5 text-muted" /><span className="flex-1">Export team data <span className="block text-xs text-muted">JSON file, owners and admins</span></span><ChevronRight aria-hidden className="size-4 text-muted" /></a>
          )}
        </div>
      </section>

      {dbEnabled && (
        <form action={signOut}>
          <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-2 px-5 text-score-1 hover:bg-surface-3">
            <LogOut aria-hidden className="size-4" /> Sign out
          </button>
        </form>
      )}
    </div>
  );
}

async function Capture() {
  const form = await getLeadForm();
  if (!form) return null;
  const base = process.env.SITE_URL ?? "";
  return <LeadFormSettings form={form} url={`${base}/f/${form.id}`} />;
}

async function Me() {
  const me = await getMe();
  return (
    <Reveal>
      <div className="flex items-center gap-4 rounded-card bg-surface-2 p-5">
        <Avatar name={me.name} size={56} />
        <div className="min-w-0">
          <p className="truncate text-xl">{me.name}</p>
          {me.email && <p className="truncate text-sm text-muted">{me.email}</p>}
        </div>
      </div>
    </Reveal>
  );
}
