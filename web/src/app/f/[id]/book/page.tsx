import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingForm, type Bookable } from "@/components/booking-form";
import { Skeleton } from "@/components/ui";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Book a showing", robots: { index: false } };

export default function BookPage({ params, searchParams }: PageProps<"/f/[id]/book">) {
  return (
    <div className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-[720px]" />}><Book params={params} searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function Book({ params, searchParams }: { params: PageProps<"/f/[id]/book">["params"]; searchParams: PageProps<"/f/[id]/book">["searchParams"] }) {
  const [{ id }, { listing }] = await Promise.all([params, searchParams]);
  const key = process.env.FORM_RPC_KEY;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  if (!key) return <p className="rounded-card bg-surface-2 p-8 text-center">This page isn&apos;t configured yet.</p>;
  const { data } = await (await supabase()).rpc("booking_info", { p_key: key, p_form: id });
  if (!data) notFound();
  const info = data as { team: string; tz: string | null; listings: Bookable[] };
  return <BookingForm formId={id} team={info.team} tz={info.tz} listings={info.listings} initial={typeof listing === "string" ? listing : ""} />;
}
