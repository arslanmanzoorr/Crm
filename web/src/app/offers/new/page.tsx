import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfferForm } from "@/components/offer-form";
import { Skeleton } from "@/components/ui";
import { getLead, getProperties, getProperty } from "@/lib/db";

export const metadata: Metadata = { title: "New offer" };

/** ?property=<listing> records an offer received on it; ?contact=<buyer> drafts our buyer's offer. */
export default function NewOfferPage({ searchParams }: PageProps<"/offers/new">) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-[720px]" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/offers/new">["searchParams"] }) {
  const sp = await searchParams;
  const property = typeof sp.property === "string" ? sp.property : undefined;
  const contact = typeof sp.contact === "string" ? sp.contact : undefined;

  if (contact) {
    const [lead, listings] = await Promise.all([getLead(contact), getProperties()]);
    if (!lead) notFound();
    return (
      <>
        <Link href={`/leads/${lead.id}`} className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← {lead.name}</Link>
        <h1 className="text-4xl font-light">Offer for {lead.name}</h1>
        <OfferForm side="buyer" contactId={lead.id} propertyId={property} listings={listings.filter((p) => p.status !== "Sold").map(({ id, address }) => ({ id, address }))} />
      </>
    );
  }
  const listing = property ? await getProperty(property) : undefined;
  if (!listing) notFound();
  return (
    <>
      <Link href={`/properties/${listing.id}`} className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← {listing.address}</Link>
      <h1 className="text-4xl font-light">Offer received</h1>
      <p className="-mt-4 text-muted">On {listing.address}, listed at {listing.price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</p>
      <OfferForm side="seller" propertyId={listing.id} />
    </>
  );
}
