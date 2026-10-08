import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PropertyForm } from "@/components/property-form";
import { getProperty } from "@/lib/db";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Edit listing" };

export default function EditPropertyPage({ params }: PageProps<"/properties/[id]/edit">) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}

async function Edit({ params }: { params: PageProps<"/properties/[id]/edit">["params"] }) {
  const p = await getProperty((await params).id);
  if (!p) notFound();
  return (
    <>
      <Link href={`/properties/${p.id}`} className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← {p.address}</Link>
      <h1 className="text-4xl font-light">Edit listing</h1>
      <PropertyForm p={p} />
    </>
  );
}
