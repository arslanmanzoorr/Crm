import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { LEGAL, LEGAL_PAGES } from "@/lib/legal";

export const metadata: Metadata = pageMeta("/legal", "Legal", "Estos legal policies in plain language: Terms of Service, Privacy Policy, refunds and cancellation, subprocessors, the Data Processing Addendum and open-source notices.");

export default function LegalIndex() {
  return (
    <>
      <h1>Legal</h1>
      <p>How {LEGAL.product} works with you and with the people in your database, in plain language.</p>
      <ul>
        {LEGAL_PAGES.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}
      </ul>
    </>
  );
}
