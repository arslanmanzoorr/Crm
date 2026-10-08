import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LeadCaptureForm } from "@/components/lead-capture-form";
import { Skeleton } from "@/components/ui";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Get in touch", robots: { index: false } };

export default function PublicFormPage({ params, searchParams }: PageProps<"/f/[id]">) {
  return (
    <div className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-[560px]" />}>
        <Form params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ params, searchParams }: { params: PageProps<"/f/[id]">["params"]; searchParams: PageProps<"/f/[id]">["searchParams"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await (await supabase()).rpc("lead_form_info", { p_form: id });
  const info = (data as { public_name: string | null; enabled: boolean }[] | null)?.[0];
  if (!info) notFound();
  const source = (await searchParams).source;
  return (
    <LeadCaptureForm
      formId={id}
      who={info.public_name || "our team"}
      open={info.enabled}
      source={typeof source === "string" ? source.slice(0, 40) : ""}
    />
  );
}
