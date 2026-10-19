import type { Metadata } from "next";
import { Suspense } from "react";
import { readUnsubToken } from "@/lib/email";
import { unsubscribe } from "@/lib/email-server";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

// The footer link in every email. A button (not a visit) does it, so link scanners and previews never unsubscribe anyone.
export default function UnsubscribePage({ params, searchParams }: PageProps<"/u/[token]">) {
  return (
    <div className="mx-auto mt-[12vh] flex max-w-md flex-col gap-4 rounded-card bg-surface-2 p-8 text-center">
      <Suspense fallback={null}><Body params={params} searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function Body({ params, searchParams }: { params: PageProps<"/u/[token]">["params"]; searchParams: PageProps<"/u/[token]">["searchParams"] }) {
  const { token } = await params;
  const done = (await searchParams).done === "1";
  const secret = process.env.EMAIL_TOKEN_SECRET;
  const valid = !!secret && !!readUnsubToken(token, secret);
  if (!valid) return <><h1 className="text-2xl">This link doesn&apos;t work</h1><p className="text-muted">It may have been copied incompletely. Reply to the email and ask to be removed, and we&apos;ll do it.</p></>;
  if (done) return <><h1 className="text-2xl">You&apos;re unsubscribed</h1><p className="text-muted">You won&apos;t get these emails anymore. If you still want to talk about a home, just reply to any earlier email.</p></>;

  async function confirm() {
    "use server";
    const id = process.env.EMAIL_TOKEN_SECRET ? readUnsubToken(token, process.env.EMAIL_TOKEN_SECRET) : null;
    if (id) await unsubscribe(id);
    const { redirect } = await import("next/navigation");
    redirect(`/u/${token}?done=1`);
  }
  return (
    <>
      <h1 className="text-2xl">Unsubscribe from these emails?</h1>
      <p className="text-muted">You&apos;ll stop getting newsletters and automated emails from this team.</p>
      <form action={confirm}><button className="min-h-11 rounded-full bg-accent px-6 font-medium text-on-light hover:bg-accent-strong">Unsubscribe</button></form>
    </>
  );
}
