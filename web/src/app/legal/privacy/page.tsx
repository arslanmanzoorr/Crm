import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, operator } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted">Effective {LEGAL.updated}</p>
      <p>
        This policy explains how {operator} (&ldquo;we&rdquo;) handles personal information in {LEGAL.product}. It covers two groups of people:
      </p>
      <ul>
        <li><b>Our customers</b>: the agents, teams and agencies who sign up and use {LEGAL.product}. For your account information, we decide how it is used.</li>
        <li><b>Our customers&apos; contacts</b>: people whose details a customer keeps in {LEGAL.product} or who fill in a customer&apos;s form, chat or booking page. Here we act only on the customer&apos;s instructions, as their service provider; the customer&apos;s own privacy notice applies, and requests about this information go to them (see &ldquo;Your choices&rdquo; below).</li>
      </ul>

      <h2>What we collect</h2>
      <h3>From customers</h3>
      <ul>
        <li>Account details: your email address and password (stored only as a secure hash by our authentication provider), your team, role and settings.</li>
        <li>What you put in the Service: leads, clients, listings and photos, deals, notes, messages, documents and email campaigns.</li>
        <li>Connected services you choose: for Google, an access token (encrypted before we store it) so we can send email you write and add calendar events; we cannot read your inbox.</li>
        <li>Records of use: sign-ins, an audit log of sensitive actions (such as exports and deletions), AI usage counts, and the acceptance of these policies.</li>
      </ul>
      <h3>From our customers&apos; contacts</h3>
      <ul>
        <li>What they enter in a customer&apos;s form, booking page, open-house sign-in or website chat: for example name, email, phone, the homes they ask about and their consent choices.</li>
        <li>Website chat messages, so the customer&apos;s team can read and answer them.</li>
        <li>For emails a customer sends through {LEGAL.product}: whether each email was delivered, opened or clicked, and any unsubscribe.</li>
        <li>A one-way scrambled (salted hash) form of the internet address, kept only to stop spam and abuse; we don&apos;t store the address itself.</li>
      </ul>
      <p>We only collect what the Service needs. We don&apos;t collect government ID numbers, financial account numbers or precise location, and we don&apos;t buy data about people.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To run the Service: show your data to your team, send the messages you send, run the follow-ups you switch on, and keep the Service secure.</li>
        <li>To provide AI features you use (see below).</li>
        <li>To support you, tell you about changes to the Service and your account, and meet legal obligations.</li>
        <li>To send you product news only if you opted in; you can unsubscribe any time.</li>
      </ul>
      <p>We do not sell or &ldquo;share&rdquo; personal information for cross-context behavioral advertising, and we have not done so in the past 12 months. We don&apos;t show ads.</p>

      <h2>AI</h2>
      <p>
        When you use an AI feature, the relevant text (for example a lead&apos;s recent messages, or a document you upload) is sent to our AI provider
        to produce the answer. We route AI requests only to model providers that commit not to store prompts or use them to train models, and we do not use
        your data to train any model ourselves. AI-written drafts are marked as such in the app. A customer&apos;s website chat assistant tells visitors that its
        answers are automated.
      </p>

      <h2>Who we share it with</h2>
      <p>
        Only with the service providers that run {LEGAL.product} for us, listed on our <Link href="/legal/subprocessors">subprocessors page</Link>, under contracts
        that limit their use of it; with services a customer chooses to connect; when the law requires it; or as part of a merger or sale of our business,
        with notice to you.
      </p>

      <h2>Cookies and similar technology</h2>
      <p>
        We use only what the Service needs to work: sign-in cookies that keep you signed in and secure, and small settings stored in your browser (for
        example, whether you have seen the welcome animation, or a website visitor&apos;s open chat). We use no advertising, analytics or tracking cookies, and
        our site loads no third-party scripts, so there is nothing to opt in to. If that ever changes, we will ask for your consent first.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account and team data: while your account is open. After you close it, we delete it within 30 days, apart from copies in backups, which are overwritten on our providers&apos; normal schedule.</li>
        <li>A lead or client a customer deletes: erased with their notes, messages and related records at the time of deletion.</li>
        <li>Website chats from visitors who never became a lead: deleted automatically after 90 days.</li>
        <li>Unsubscribes and Do Not Call flags: kept for as long as the customer&apos;s account exists, so we keep honoring them.</li>
        <li>Records we must keep by law, or for an open dispute: only as long as needed for that.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <p>
        Depending on where you live (including California, Colorado, Connecticut, Virginia, Texas and other states with privacy laws), you may have the right
        to know what personal information we hold about you, get a copy, correct it, delete it, and opt out of its sale, sharing or use for targeted
        advertising or profiling (we do none of these). We will not treat you differently for using these rights.
      </p>
      <ul>
        <li><b>Customers</b>: download your team&apos;s data from Account at any time (owners and admins), correct it in the app, or email <a href={`mailto:${LEGAL.privacy}`}>{LEGAL.privacy}</a> to access or delete your information or close your account.</li>
        <li><b>A customer&apos;s contacts</b>: use the &ldquo;Your privacy choices&rdquo; link on the form you filled in, or contact the agent or team directly. We pass requests to them and help them respond. Every marketing email has an unsubscribe link that works in one click.</li>
      </ul>
      <p>We answer verified requests within 45 days. You can use an authorized agent; we may ask them for proof of your permission. If we refuse a request, you can appeal by replying to our answer, and we will respond within 60 days.</p>

      <h2>Security</h2>
      <p>Data is encrypted in transit; each team&apos;s records are walled off from every other team in the database; two-step sign-in is available; sensitive tokens are encrypted before storage; and access is logged. No system is perfectly secure; if a breach affects your information, we will tell you as the law requires.</p>

      <h2>Children</h2>
      <p>{LEGAL.product} is for business use by adults. We don&apos;t knowingly collect information from children under 13.</p>

      <h2>Where it is processed</h2>
      <p>Our database and file storage are in the European Union (Frankfurt, Germany). The app itself runs in the United States, and our email and AI providers are US companies. Each provider and its location is on our <Link href="/legal/subprocessors">subprocessors page</Link>.</p>

      <h2>Changes</h2>
      <p>If we change this policy materially, we will tell you in the app or by email before the change takes effect and ask you to accept it the next time you sign in.</p>

      <h2>Contact</h2>
      <p>
        {operator}{LEGAL.address && <>, {LEGAL.address}</>}. Privacy questions and requests: <a href={`mailto:${LEGAL.privacy}`}>{LEGAL.privacy}</a>.
      </p>
    </>
  );
}
