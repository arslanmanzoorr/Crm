import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, operator } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted">Effective {LEGAL.updated}</p>
      <p>
        These terms are an agreement between you and {operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for your use of {LEGAL.product}, the real estate
        CRM at {LEGAL.site.replace("https://", "")} (the &ldquo;Service&rdquo;). By creating an account or using the Service you agree to them. If you use the
        Service for a brokerage, team or agency, you confirm you can agree for it, and &ldquo;you&rdquo; includes it.
      </p>

      <h2>1. Who can use the Service</h2>
      <p>You must be at least 18 and use the Service for your business. Keep your sign-in details private and turn on two-step sign-in where you can. You are responsible for what happens under your account and your team&apos;s accounts.</p>

      <h2>2. Your data</h2>
      <p>
        You own the data you and your team put into the Service or collect through it, including your leads&apos; and clients&apos; details (&ldquo;Customer Data&rdquo;).
        You give us permission to host, process and display it only to run, secure and support the Service for you. We do not sell it, and we do not use it to
        train AI models. How we handle personal information is in our <Link href="/legal/privacy">Privacy Policy</Link>; for Customer Data we act as your
        service provider under our <Link href="/legal/dpa">Data Processing Addendum</Link>, which forms part of these terms.
      </p>
      <p>You can download your team&apos;s data at any time (Account, owners and admins). If your account ends, you can still request an export for 30 days; after that we delete it as described in the Privacy Policy.</p>

      <h2>3. Your responsibilities with your contacts</h2>
      <p>The Service gives you tools to call, text and email people. You decide who you contact and what you send, so you are responsible for following the laws and rules that apply to you, including:</p>
      <ul>
        <li>having the consent you need before calling or texting (the Telephone Consumer Protection Act and state laws) and honoring the Do Not Call Registry and opt-outs;</li>
        <li>email marketing rules (CAN-SPAM): a working unsubscribe and your postal address, both of which the Service adds;</li>
        <li>fair housing laws, real estate licensing and advertising rules, RESPA, and your MLS&apos;s rules;</li>
        <li>telling people how you use their information, through your own privacy notice where the law requires it.</li>
      </ul>
      <p>The Service&apos;s consent checks, calling-hour limits and Do Not Call tools help, but they do not replace your own judgment or legal advice.</p>

      <h2>4. AI features</h2>
      <p>
        Some features use AI to draft messages, score leads, summarize documents and answer questions. AI output can be wrong or incomplete. Drafts are
        marked as AI-written; read them before you send or rely on them. AI output is not legal, tax, lending or appraisal advice.
      </p>
      <p>
        If you switch on the website chat assistant, it answers your website visitors automatically, using your listings, and tells visitors that answers are
        automated and that a person can take over. You can turn it off or take over any chat. You are responsible for the listings and information it
        answers from.
      </p>

      <h2>5. Acceptable use</h2>
      <p>Don&apos;t use the Service to: break the law; send spam or messages without the consent the law requires; discriminate in housing; upload content you have no right to use; access other customers&apos; data; probe, overload or bypass the Service&apos;s security or limits; or resell the Service without our written agreement. We may suspend accounts that do, and we will tell you why unless the law or safety prevents it.</p>

      <h2>6. Third-party services</h2>
      <p>You can connect services such as Google (Gmail and Calendar), listing feeds and automation tools. Their own terms apply to them, and we are not responsible for them. When you connect one, you tell us to send it the data the connection needs.</p>

      <h2>7. Fees</h2>
      <p>
        {LEGAL.product} is currently free to use. If we introduce paid plans, we will show the full price, how often it renews and how to cancel before you
        are charged, and we will only charge you after you agree. Our <Link href="/legal/refunds">Refunds and cancellation policy</Link> explains how
        cancelling and refunds work.
      </p>

      <h2>8. Our property</h2>
      <p>The Service, its software, design and content (other than Customer Data) belong to us or our licensors. We give you a limited, non-exclusive, non-transferable right to use it while you have an account. If you send us suggestions, we may use them without owing you anything. Open-source components are listed in our <Link href="/legal/open-source">open-source notices</Link>.</p>

      <h2>9. Copyright complaints</h2>
      <p>If you believe something on the Service infringes your copyright, send a notice to <a href={`mailto:${LEGAL.support}`}>{LEGAL.support}</a> with: your contact details; the work you say is infringed; where the material is on the Service; a statement that you believe in good faith the use is not authorized; a statement, under penalty of perjury, that your notice is accurate and that you are the owner or authorized to act for them; and your physical or electronic signature. We remove infringing material and close repeat infringers&apos; accounts.</p>

      <h2>10. Availability and changes</h2>
      <p>We work to keep the Service running and secure, but we do not promise it will be uninterrupted or error-free, and we do not offer an uptime guarantee. We may change features; if we remove something material you rely on, we will tell you in advance where we reasonably can.</p>

      <h2>11. Disclaimers</h2>
      <p className="uppercase text-sm">To the extent the law allows, the Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, including merchantability, fitness for a particular purpose and non-infringement.</p>

      <h2>12. Limits on liability</h2>
      <p className="uppercase text-sm">To the extent the law allows, we are not liable for indirect, incidental, special, consequential or punitive damages, or lost profits, revenue or data, and our total liability for any claim about the Service is limited to the greater of the amount you paid us in the 12 months before the claim and US $100. Some places don&apos;t allow these limits, so they may not apply to you.</p>

      <h2>13. Indemnity</h2>
      <p>You will defend and indemnify us against claims by third parties that arise from the messages you send through the Service, your Customer Data, or your breach of these terms or the law.</p>

      <h2>14. Ending your account</h2>
      <p>You can stop using the Service and ask us to close your account at any time by emailing <a href={`mailto:${LEGAL.support}`}>{LEGAL.support}</a>. We may suspend or close accounts that break these terms. Sections 2 (export window), 8, 11, 12, 13 and 15 survive.</p>

      <h2>15. General</h2>
      <p>
        {LEGAL.state && <>These terms are governed by the laws of the State of {LEGAL.state}, without regard to its conflict-of-laws rules. </>}
        If part of these terms can&apos;t be enforced, the rest still applies. You may not transfer these terms without our consent; we may transfer them with our business.
        These terms, the Privacy Policy and the Data Processing Addendum are the whole agreement about the Service.
      </p>

      <h2>16. Changes to these terms</h2>
      <p>If we change these terms materially, we will tell you before the change takes effect and ask you to accept the new version the next time you sign in. The effective date is at the top.</p>

      <h2>17. Contact</h2>
      <p>
        {operator}{LEGAL.address && <>, {LEGAL.address}</>}. Email <a href={`mailto:${LEGAL.support}`}>{LEGAL.support}</a>.
      </p>
    </>
  );
}
