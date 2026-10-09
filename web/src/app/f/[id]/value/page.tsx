import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { ValuationForm } from "@/components/valuation-form";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "What's your home worth?", robots: { index: false } };

export default function ValuationPage({ params }: PageProps<"/f/[id]/value">) {
  return (
    <div className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-[720px]" />}><Form params={params} /></Suspense>
    </div>
  );
}

async function Form({ params }: { params: PageProps<"/f/[id]/value">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await (await supabase()).rpc("lead_form_info", { p_form: id });
  const info = (data as { public_name: string | null; enabled: boolean }[] | null)?.[0];
  if (!info) notFound();
  return <ValuationForm formId={id} who={info.public_name || "our team"} open={info.enabled} />;
}
