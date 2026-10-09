import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { PrintButton } from "@/components/print-button";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Open house poster", robots: { index: false } };

/** A printable sign for the door: big QR code to the sign-in page. Prints black on white. */
export default function Poster({ params }: PageProps<"/oh/[id]/poster">) {
  return (
    <Suspense>
      <Sheet params={params} />
    </Suspense>
  );
}

async function Sheet({ params }: { params: PageProps<"/oh/[id]/poster">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await (await supabase()).rpc("open_house_info", { p_id: id });
  const info = (data as { address: string; team: string }[] | null)?.[0];
  if (!info) notFound();
  const qr = await QRCode.toString(`${process.env.SITE_URL ?? ""}/oh/${id}`, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 rounded-card bg-white p-10 text-center text-neutral-950 print:max-w-none print:rounded-none print:p-0">
      <div>
        <p className="text-lg">Welcome! Please sign in</p>
        <h1 className="mt-2 text-4xl font-light">{info.address}</h1>
      </div>
      <div className="w-full max-w-sm [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
      <p className="text-lg">Scan with your phone camera</p>
      <p className="text-sm text-neutral-600">Hosted by {info.team}</p>
      <PrintButton />
    </div>
  );
}
