import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Subprocessors" };

const ROWS = [
  ["Supabase, Inc.", "Database, sign-in, file storage and scheduled jobs", "All data in the Service", "European Union (Frankfurt, Germany)", "https://supabase.com/privacy"],
  ["Vercel Inc.", "Hosting the app and delivering pages", "All data passing through the app", "United States", "https://vercel.com/legal/privacy-policy"],
  ["OpenRouter, Inc.", "Routing AI requests to a model provider that neither stores prompts nor trains on them", "Text sent to AI features", "United States", "https://openrouter.ai/privacy"],
  ["Resend (Plus Five Five, Inc.)", "Sending email campaigns and drip emails, and reporting delivery", "Recipient email address, message, delivery events", "United States", "https://resend.com/legal/privacy-policy"],
  ["Google LLC", "Google sign-in, and sending email and adding calendar events when a user connects Google", "The user's Google account details, emails and events they send", "United States", "https://policies.google.com/privacy"],
] as const;

export default function SubprocessorsPage() {
  return (
    <>
      <h1>Subprocessors</h1>
      <p className="text-sm text-muted">Updated {LEGAL.updated}</p>
      <p>These companies process personal information for us to run {LEGAL.product}. Each is bound by a contract that limits its use of the data to providing its service. We add a provider to this page, and email account owners, at least 14 days before it starts processing Customer Data.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr><th>Provider</th><th>What it does</th><th>Data</th><th>Location</th></tr></thead>
          <tbody>
            {ROWS.map(([name, what, data, where, url]) => (
              <tr key={name}><td><a href={url} rel="noopener noreferrer" target="_blank">{name}</a></td><td>{what}</td><td>{data}</td><td>{where}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Services you connect yourself</h2>
      <p>When a customer turns on an integration, such as a listing feed, an automation webhook or a calendar subscription, we send that service the data the integration needs, on the customer&apos;s instruction. Those services are chosen by the customer and are not our subprocessors.</p>
    </>
  );
}
