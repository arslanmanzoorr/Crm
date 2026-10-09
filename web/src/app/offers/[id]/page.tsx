import { Handshake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LocalTime } from "@/components/local-time";
import { OfferMoves, OfferNote } from "@/components/offer-moves";
import { Chip, Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { getOffer } from "@/lib/db";
import { CONTINGENCIES, FINANCING, netOf, STATUS_LABEL } from "@/lib/offers";

export const metadata: Metadata = { title: "Offer" };

export default function OfferPage({ params }: PageProps<"/offers/[id]">) {
  return (
    <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-16 max-w-lg" /><Skeleton className="h-96" /></div>}>
      <OfferView params={params} />
    </Suspense>
  );
}

const EVENT: Record<string, (side: string) => string> = {
  drafted: () => "Drafted",
  received: () => "Offer received",
  submitted: () => "Sent to the listing agent",
  countered: (s) => (s === "seller" ? "We countered" : "We countered back"),
  counter_received: (s) => (s === "seller" ? "Buyer countered back" : "Seller countered"),
  accepted: () => "Accepted",
  rejected: () => "Rejected",
  withdrawn: (s) => (s === "seller" ? "Buyer withdrew" : "We withdrew"),
  note: () => "Note",
};

async function OfferView({ params }: { params: PageProps<"/offers/[id]">["params"] }) {
  const o = await getOffer((await params).id);
  if (!o) notFound();
  const live = !["accepted", "rejected", "withdrawn"].includes(o.status);
  const back = o.side === "seller" && o.property ? { href: `/properties/${o.property.id}`, label: "← Listing" } : o.contact ? { href: `/leads/${o.contact.id}`, label: `← ${o.contact.name}` } : { href: "/deals", label: "← Deals" };
  const dealHref = `/deals/new?offer=${o.id}${o.contact ? `&contact=${o.contact.id}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href={back.href} className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">{back.label}</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2"><Chip tone={live ? "accent" : "dark"}>{STATUS_LABEL[o.status]}</Chip><Chip>{o.side === "seller" ? "Received on our listing" : "Our buyer's offer"}</Chip></div>
          <h1 className="mt-3 text-4xl font-light">{o.address}</h1>
          <p className="text-muted">{o.side === "seller" ? `From ${o.buyerName || "an unnamed buyer"}` : <>For <Link href={`/leads/${o.contact!.id}`} className="text-ink hover:text-accent">{o.contact!.name}</Link></>}</p>
        </div>
        <span className="text-4xl font-light text-accent">{money(o.amount)}</span>
      </header>

      {o.status === "accepted" && !o.dealId && (
        <Link href={dealHref} className="flex min-h-14 items-center gap-3 rounded-card bg-accent px-5 font-medium text-on-light hover:bg-accent-strong">
          <Handshake aria-hidden className="size-5" /> Accepted. Open the deal to start the milestone checklist
        </Link>
      )}
      {o.dealId && <Link href={`/deals/${o.dealId}`} className="w-fit text-sm text-accent underline">View the deal</Link>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="terms" className="rounded-card bg-surface-2 p-5">
            <h2 id="terms" className="text-lg">Terms</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Term k="Price" v={money(o.amount)} />
              <Term k="Net of credits" v={money(netOf(o))} />
              <Term k="Earnest money" v={o.earnest ? money(o.earnest) : "None"} />
              <Term k="Financing" v={`${FINANCING[o.financing]}${o.downPct !== null && o.financing !== "cash" ? `, ${o.downPct}% down` : ""}`} />
              <Term k="Seller credit" v={o.sellerCredit ? money(o.sellerCredit) : "None"} />
              <Term k="Closing" v={o.closeOn ?? "Not set"} />
              <div className="col-span-full"><dt className="text-muted">Contingencies</dt><dd>{o.contingencies.length ? o.contingencies.map((c) => CONTINGENCIES[c]).join(", ") : "None"}</dd></div>
              {o.expiresAt && <div className="col-span-full"><dt className="text-muted">Respond by</dt><dd><LocalTime ts={o.expiresAt} opts={{ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} /></dd></div>}
            </dl>
            {o.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-ink/80">{o.notes}</p>}
          </section>

          <section aria-labelledby="history" className="flex flex-col gap-3">
            <h2 id="history" className="text-xl">Negotiation</h2>
            <ol className="flex flex-col gap-0 border-l border-white/10 pl-5">
              {o.events.map((e, i) => (
                <li key={i} className="relative pb-4 last:pb-0">
                  <span aria-hidden className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full ${e.kind === "accepted" ? "bg-accent" : e.kind === "rejected" || e.kind === "withdrawn" ? "bg-score-1" : "bg-white/40"}`} />
                  <p className="text-sm"><span className="font-medium">{EVENT[e.kind]?.(o.side) ?? e.kind}</span>{e.amount !== null && <span> at {money(e.amount)}</span>}</p>
                  {e.note && <p className="text-sm text-ink/80">{e.note}</p>}
                  <p className="text-xs text-muted"><LocalTime ts={e.ts} /></p>
                </li>
              ))}
            </ol>
            <OfferNote offerId={o.id} />
          </section>
        </div>

        {live && (
          <aside className="rounded-card bg-surface-2 p-5 lg:self-start">
            <h2 className="mb-3 text-lg">Next step</h2>
            <OfferMoves key={o.events.length} offerId={o.id} side={o.side} status={o.status} amount={o.amount} />
          </aside>
        )}
      </div>
    </div>
  );
}

function Term({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-muted">{k}</dt><dd>{v}</dd></div>;
}
