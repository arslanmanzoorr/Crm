import { Check, X } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { decideOAuth } from "@/lib/actions";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Connect an app" };

// Estos sign-in as an OAuth server: an AI app (Claude, ChatGPT…) sends the person here to approve access.
export default function ConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6">
      <Suspense fallback={<Skeleton className="h-96" />}><Body searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function Body({ searchParams }: { searchParams: PageProps<"/oauth/consent">["searchParams"] }) {
  const sp = await searchParams;
  const id = typeof sp.authorization_id === "string" ? sp.authorization_id : "";
  const { data, error } = id ? await (await supabase()).auth.oauth.getAuthorizationDetails(id) : { data: null, error: null };
  if (!data || error) {
    return (
      <div className="rounded-card bg-surface-2 p-6">
        <h1 className="text-2xl font-light">This link has expired</h1>
        <p className="mt-2 text-muted">Start connecting again from your AI app.</p>
      </div>
    );
  }
  if ("redirect_url" in data) redirect(data.redirect_url); // already approved before
  const app = data.client.name || "An app";
  const host = (() => { try { return new URL(data.redirect_uri).host; } catch { return data.redirect_uri; } })();
  const approve = decideOAuth.bind(null, data.authorization_id, true);
  const deny = decideOAuth.bind(null, data.authorization_id, false);
  return (
    <div className="flex flex-col gap-5 rounded-card bg-surface-2 p-6">
      <div>
        <h1 className="text-3xl font-light text-balance">{app} wants to use Estos as you</h1>
        <p className="mt-2 text-sm text-muted">Signed in as <span className="text-ink">{data.user.email}</span>. After you approve, you go back to <span className="text-ink">{host}</span>.</p>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {["See your team's leads, listings, deals, showings and tasks", "Add and update leads, tasks, notes and showings", "Only what you can do yourself, on your active team"].map((t) => (
          <li key={t} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" />{t}</li>
        ))}
        <li className="flex gap-2 text-muted"><X aria-hidden className="mt-0.5 size-4 shrink-0" />It can&apos;t send messages, delete anything or record consent</li>
      </ul>
      <p className="text-xs text-muted">Only approve apps you started connecting yourself. You can disconnect it any time in Account → Connect your AI.</p>
      <div className="flex flex-wrap gap-2">
        <form action={approve}><button className="min-h-12 rounded-full bg-accent px-6 font-medium text-on-light hover:bg-accent-strong">Approve</button></form>
        <form action={deny}><button className="min-h-12 rounded-full bg-surface-3 px-6 font-medium hover:bg-surface-1">Deny</button></form>
      </div>
    </div>
  );
}
