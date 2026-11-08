import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, operator } from "@/lib/legal";

export const metadata: Metadata = { title: "Data Processing Addendum" };

export default function DpaPage() {
  return (
    <>
      <h1>Data Processing Addendum</h1>
      <p className="text-sm text-muted">Effective {LEGAL.updated}</p>
      <p>
        This addendum is part of the <Link href="/legal/terms">Terms of Service</Link> between you (the customer) and {operator}. It applies to personal
        information about your leads, clients and other contacts that we process for you in {LEGAL.product} (&ldquo;Customer Personal Data&rdquo;). You decide
        why and how that information is used; we process it only for you, as your processor and &ldquo;service provider&rdquo; (as defined in the California
        Consumer Privacy Act and similar state laws).
      </p>

      <h2>1. What we do with Customer Personal Data</h2>
      <ul>
        <li>We process it only to provide, secure and support the Service, following your instructions, which are these terms and how you use and configure the Service.</li>
        <li>We do not sell or share it, use it for advertising, use it to train AI models, combine it with other data except as needed to provide the Service, or keep, use or disclose it for any other purpose.</li>
        <li>We tell you if we believe an instruction breaks the law.</li>
      </ul>

      <h2>2. People and security</h2>
      <p>Anyone at {operator} who can access Customer Personal Data is bound by confidentiality. We keep technical and organizational safeguards appropriate to the risk, including encryption in transit, per-team isolation in the database, access logging, optional two-step sign-in and encrypted storage of connection tokens.</p>

      <h2>3. Subprocessors</h2>
      <p>You allow us to use the providers on our <Link href="/legal/subprocessors">subprocessors page</Link>. Each is bound to data protection terms at least as protective as these. We give account owners at least 14 days&apos; notice by email before adding one; you may object on reasonable data protection grounds, and if we can&apos;t address the objection you may close your account.</p>

      <h2>4. Helping you</h2>
      <ul>
        <li>We help you answer requests from people exercising their privacy rights, for example by passing on requests made through your forms&apos; &ldquo;Your privacy choices&rdquo; page and through in-app export and deletion.</li>
        <li>We give you the information you reasonably need to carry out privacy assessments and show compliance, including this addendum and our security description.</li>
      </ul>

      <h2>5. Security incidents</h2>
      <p>If we become aware of unauthorized access to Customer Personal Data, we notify you without undue delay and within 72 hours where feasible, tell you what we know, and help you meet any duty to notify the people affected.</p>

      <h2>6. Deletion and return</h2>
      <p>You can export your data at any time. When your account ends we delete Customer Personal Data within 30 days, after the export window in the Terms, apart from backup copies that are overwritten on our providers&apos; schedule, unless the law requires us to keep it.</p>

      <h2>7. Location</h2>
      <p>Customer Personal Data is stored in the European Union (Frankfurt, Germany) and processed in the United States, as listed on the subprocessors page.</p>

      <h2>8. Precedence</h2>
      <p>If this addendum and the Terms conflict about Customer Personal Data, this addendum wins. If you need a signed copy for your records, email <a href={`mailto:${LEGAL.privacy}`}>{LEGAL.privacy}</a>.</p>
    </>
  );
}
