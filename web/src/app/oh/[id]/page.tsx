import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckinForm } from "@/components/checkin-form";
import { Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Open house sign-in", robots: { index: false } };

type Info = { address: string; area: string; price: number; beds: number; baths: number; team: string; open: boolean };

export default function OpenHouseSignIn({ params }: PageProps<"/oh/[id]">) {
  return (
    <div className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-[640px]" />}>
        <SignIn params={params} />
      </Suspense>
    </div>
  );
}

async function SignIn({ params }: { params: PageProps<"/oh/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await (await supabase()).rpc("open_house_info", { p_id: id });
  const info = (data as Info[] | null)?.[0];
  if (!info) notFound();
  return (
    <div className="flex flex-col gap-6 rounded-card bg-surface-2 p-6 sm:p-8">
      <header>
        <p className="text-sm text-muted">Welcome to the open house</p>
        <h1 className="mt-1 text-3xl font-light">{info.address}</h1>
        <p className="mt-1 text-muted">{[info.area, money(Number(info.price)), `${info.beds} bd`, `${Number(info.baths)} ba`].filter(Boolean).join(" · ")}</p>
      </header>
      {info.open ? <CheckinForm id={id} who={info.team} /> : <p className="rounded-card bg-surface-3 p-6 text-center">Sign-in for this open house is closed.</p>}
      <p className="text-center text-xs text-muted">Hosted by {info.team} · Powered by EstateOS</p>
    </div>
  );
}
