import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Refunds and cancellation" };

export default function RefundsPage() {
  return (
    <>
      <h1>Refunds and cancellation</h1>
      <p className="text-sm text-muted">Effective {LEGAL.updated}</p>
      <p><b>Today, {LEGAL.product} is free.</b> There is nothing to cancel or refund, and we will never charge you without asking first.</p>
      <p>If we introduce paid plans, these promises apply:</p>
      <ul>
        <li><b>Clear price.</b> We show the full price, including every fee, before you buy. Taxes, where they apply, are shown at checkout. No setup, cancellation or hidden fees.</li>
        <li><b>Automatic renewal, said plainly.</b> Paid plans renew automatically every month or year, at the price shown, until you cancel. We tell you this before you subscribe and ask for your clear agreement, and we email you a reminder before any yearly renewal.</li>
        <li><b>Cancel online, any time.</b> You can cancel in the app in a few clicks, the same way you signed up, without calling or emailing anyone. Cancelling stops the next renewal; you keep paid features until the end of the period you already paid for.</li>
        <li><b>Refunds.</b> If you ask within {LEGAL.refundDays} days of your first paid charge, we refund it in full. Otherwise payments are not refunded, except where the law requires it or we charged you by mistake, which we always fix.</li>
        <li><b>Price changes.</b> We tell you at least 30 days before a price change takes effect, so you can cancel first.</li>
      </ul>
      <p>Questions: <a href={`mailto:${LEGAL.support}`}>{LEGAL.support}</a>.</p>
    </>
  );
}
