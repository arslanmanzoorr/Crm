import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrivacyRequestForm } from "@/components/privacy-request";
import { Skeleton } from "@/components/ui";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Your privacy choices", robots: { index: false } };

export default function PrivacyRequestPage({ params }: PageProps<"/f/[id]/privacy">) {
  return (
    <div className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-[640px]" />}><Form params={params} /></Suspense>
    </div>
  );
}

async function Form({ params }: { params: PageProps<"/f/[id]/privacy">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await (await supabase()).rpc("lead_form_info", { p_form: id });
  const info = (data as { public_name: string | null }[] | null)?.[0];
  if (!info) notFound();
  return <PrivacyRequestForm formId={id} who={info.public_name || "this team"} />;
}
