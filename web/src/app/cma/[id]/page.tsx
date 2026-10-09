import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CmaEditor } from "@/components/cma-editor";
import { Skeleton } from "@/components/ui";
import { getCma } from "@/lib/db";

export const metadata: Metadata = { title: "CMA" };

export default function CmaPage({ params }: PageProps<"/cma/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-[640px]" />}><Editor params={params} /></Suspense>
    </div>
  );
}

async function Editor({ params }: { params: PageProps<"/cma/[id]">["params"] }) {
  const cma = await getCma((await params).id);
  if (!cma) notFound();
  return (
    <>
      <Link href="/cma" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All CMAs</Link>
      <header>
        <p className="text-sm text-muted">Comparative market analysis</p>
        <h1 className="text-4xl font-light">{cma.address}</h1>
        {cma.propertyId && <Link href={`/properties/${cma.propertyId}`} className="text-sm text-accent">View listing</Link>}
      </header>
      <CmaEditor cma={cma} />
    </>
  );
}
