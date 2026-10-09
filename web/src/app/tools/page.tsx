import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AffordabilityCalculator, InvestmentAnalyzer, PaymentCalculator } from "@/components/calculators";
import { Skeleton } from "@/components/ui";
import { getLeadOptions } from "@/lib/db";

export const metadata: Metadata = { title: "Calculators" };

const TABS = [["payment", "Monthly payment"], ["afford", "Affordability"], ["invest", "Investment"]] as const;

export default function ToolsPage({ searchParams }: PageProps<"/tools">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-light">Calculators</h1>
      <Suspense fallback={<Skeleton className="h-[480px]" />}>
        <Tools searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Tools({ searchParams }: { searchParams: PageProps<"/tools">["searchParams"] }) {
  const [sp, leads] = await Promise.all([searchParams, getLeadOptions()]);
  const tab = TABS.some(([t]) => t === sp.tab) ? (sp.tab as (typeof TABS)[number][0]) : "payment";
  const price = Math.max(0, Math.min(Number(sp.price) || 0, 1e9));
  const keep = price ? `&price=${price}` : "";
  return (
    <>
      <nav aria-label="Calculator" className="flex w-fit flex-wrap gap-1 rounded-full bg-surface-2 p-1">
        {TABS.map(([t, label]) => (
          <Link key={t} href={`/tools?tab=${t}${keep}`} aria-current={t === tab ? "page" : undefined}
            className={`flex min-h-10 items-center rounded-full px-4 text-sm ${t === tab ? "bg-surface-light font-medium text-on-light" : "text-muted hover:text-ink"}`}>{label}</Link>
        ))}
      </nav>
      {tab === "payment" && <PaymentCalculator initialPrice={price} leads={leads} />}
      {tab === "afford" && <AffordabilityCalculator leads={leads} />}
      {tab === "invest" && <InvestmentAnalyzer initialPrice={price} leads={leads} />}
    </>
  );
}
