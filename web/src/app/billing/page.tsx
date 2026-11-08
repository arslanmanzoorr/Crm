import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlanPicker } from "@/components/plan-picker";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getAppBrand, getPaidSeats, isOwnerOrAdmin } from "@/lib/db";
import { BILLING_LIVE, NEEDS, planName, PLANS, TRIAL_DAYS, type Capability } from "@/lib/plans";

export const metadata: Metadata = { title: "Plan and billing" };

const NEED_LABEL: Record<Capability, string> = {
  ai: "AI features are", chatAssistant: "The website chat assistant is", email: "Email newsletters and drip emails are", farm: "Farming and market reports are",
  marketing: "Listing videos and social posts are", routing: "Lead routing is", offices: "Offices are", agency: "Agency mode is", whiteLabel: "White-label branding is",
};

export default function BillingPage({ searchParams }: PageProps<"/billing">) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/account" className="text-sm text-muted hover:text-ink">Account</Link>
        <h1 className="text-4xl font-light">Plan and billing</h1>
        <p className="mt-1 max-w-2xl text-muted">Priced per agent: every owner, admin and agent. Assistants are free. <Link href="/pricing" className="underline hover:text-ink">Compare plans</Link></p>
      </header>
      {dbEnabled ? <Suspense fallback={<Skeleton className="h-72" />}><Body searchParams={searchParams} /></Suspense> : <p className="text-muted">Connect the database to manage your plan.</p>}
    </div>
  );
}

async function Body({ searchParams }: { searchParams: PageProps<"/billing">["searchParams"] }) {
  const [sp, brand, seats, admin] = await Promise.all([searchParams, getAppBrand(), getPaidSeats(), isOwnerOrAdmin()]);
  if (!brand) return <p className="text-muted">Join or create a team first.</p>;
  const need = typeof sp.need === "string" && sp.need in NEEDS ? (sp.need as Capability) : null;
  return (
    <>
      {need && (
        <p role="status" className="rounded-card bg-surface-2 p-5">
          {NEED_LABEL[need]} part of the {planName(NEEDS[need])} plan.
          {admin ? " Pick it below." : " Ask an owner or admin to change the plan."}
        </p>
      )}
      {!BILLING_LIVE && (
        <p className="max-w-3xl rounded-card border-l-4 border-accent bg-surface-2 p-5 text-sm">
          <b className="font-medium">Early access: free.</b> Switch plans as often as you like to see what each includes. The prices show what the plan
          will cost when billing starts. We&apos;ll give at least 30 days&apos; notice, new teams will get a {TRIAL_DAYS}-day trial, and nobody is charged without
          choosing a plan and agreeing to it.
        </p>
      )}
      <PlanPicker plan={brand.plan} interval={brand.interval} seats={seats} canEdit={admin} />
      <section aria-labelledby="included" className="rounded-card bg-surface-2 p-5">
        <h2 id="included" className="text-xl">What {planName(brand.plan)} includes</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {PLANS.find((p) => p.key === brand.plan)!.includes.map((f) => <li key={f} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" />{f}</li>)}
        </ul>
      </section>
    </>
  );
}
