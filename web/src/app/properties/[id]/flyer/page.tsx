import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { PrintButton } from "@/components/print-button";
import { money } from "@/lib/data";
import { getLeadForm, getMe, getProperty } from "@/lib/db";

export const metadata: Metadata = { title: "Listing flyer", robots: { index: false } };

/** One-page printable flyer. The QR goes to the team's contact form tagged "Flyer", so flyer leads show in source analytics. */
export default function Flyer({ params }: PageProps<"/properties/[id]/flyer">) {
  return <Suspense><Sheet params={params} /></Suspense>;
}

async function Sheet({ params }: { params: PageProps<"/properties/[id]/flyer">["params"] }) {
  const [p, form, me] = await Promise.all([params.then(({ id }) => getProperty(id)), getLeadForm(), getMe()]);
  if (!p) notFound();
  const contactUrl = form ? `${process.env.SITE_URL ?? ""}/f/${form.id}?source=Flyer` : null;
  const qr = contactUrl ? await QRCode.toString(contactUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) : null;
  const cover = p.photos?.[0]?.url ?? p.cover;
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 rounded-card bg-white p-8 text-neutral-900 print:max-w-none print:rounded-none print:p-0">
      <div className="flex justify-end print:hidden"><PrintButton /></div>
      {cover
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
        ? <img src={cover} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover print:rounded-none" />
        : <div aria-hidden className={`aspect-[16/9] w-full rounded-2xl bg-gradient-to-br ${p.tone}`} />}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-neutral-600">{p.status === "Coming soon" ? "Coming soon" : "For sale"}{p.area && ` · ${p.area}`}</p>
          <h1 className="text-4xl font-light">{p.address}</h1>
          <p className="mt-1 text-lg">{p.beds} bedrooms · {p.baths} bathrooms · {p.sqft.toLocaleString()} sqft</p>
        </div>
        <p className="text-4xl font-light">{money(p.price)}</p>
      </header>
      {p.features.length > 0 && <ul className="flex flex-wrap gap-2 text-sm">{p.features.map((f) => <li key={f} className="rounded-full bg-neutral-100 px-3 py-1">{f}</li>)}</ul>}
      {p.description && <p className="leading-relaxed">{p.description}</p>}
      <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-neutral-200 pt-6">
        <div className="text-sm">
          <p className="font-medium">{me.name}</p>
          {me.email && <p className="text-neutral-600">{me.email}</p>}
          {p.tourUrl && <p className="mt-2 text-neutral-600">Virtual tour: {p.tourUrl}</p>}
          <p className="mt-2 text-xs text-neutral-500">Information deemed reliable but not guaranteed. Equal Housing Opportunity.</p>
        </div>
        {qr && (
          <div className="flex items-center gap-3">
            <div className="size-28 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="max-w-[9rem] text-sm">Scan to ask a question or book a showing</p>
          </div>
        )}
      </footer>
    </article>
  );
}
