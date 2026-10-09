import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { supabase } from "@/lib/db";

export const metadata: Metadata = { title: "Join team", robots: { index: false } };

const MESSAGES: Record<string, string> = {
  invalid: "This invite link isn't valid. Ask your team admin for a new one.",
  used: "This invite has already been used.",
  expired: "This invite has expired. Ask your team admin to send a new one.",
  wrong_email: "This invite was sent to a different email address. Sign in with that email, or ask for a new invite.",
};

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <div className="mx-auto mt-[10vh] flex max-w-md flex-col gap-4 rounded-card bg-surface-2 p-8">
      <Suspense fallback={<Skeleton className="h-24" />}>
        <Accept params={params} />
      </Suspense>
    </div>
  );
}

async function Accept({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  const db = await supabase();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  // The database checks the token, expiry, single use and that it matches this account's email.
  const { data: result } = /^[0-9a-f-]{36}$/i.test(token) ? await db.rpc("accept_invite", { p_token: token }) : { data: "invalid" };
  if (result === "ok") redirect("/");
  return (
    <>
      <h1 className="text-2xl">Couldn&apos;t join the team</h1>
      <p className="text-muted">{MESSAGES[result] ?? MESSAGES.invalid}</p>
      <Link href="/" className="w-fit text-sm text-accent underline">Go to your workspace</Link>
    </>
  );
}
