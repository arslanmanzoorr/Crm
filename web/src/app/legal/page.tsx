import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LEGAL_PAGES } from "@/lib/legal";

export const metadata: Metadata = { title: "Legal" };

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
