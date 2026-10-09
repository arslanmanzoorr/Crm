import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PropertyForm } from "@/components/property-form";
import { Skeleton } from "@/components/ui";
import { getLeadOptions } from "@/lib/db";

export const metadata: Metadata = { title: "New listing" };

export default function NewPropertyPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/properties" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All listings</Link>
      <h1 className="text-4xl font-light">New listing</h1>
      <Suspense fallback={<Skeleton className="h-96" />}><Form /></Suspense>
    </div>
  );
}

async function Form() {
  return <PropertyForm clients={await getLeadOptions()} />;
}
