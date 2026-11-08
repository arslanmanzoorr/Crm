"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, primaryBtn } from "@/components/forms";
import { TermsConsent } from "@/components/terms-consent";
import { acceptTerms, signOut } from "@/lib/actions";

/** Shown once per policy version: before first use (Google sign-ups, invites) and after a material change. */
export default function AcceptPage() {
  return <Suspense><Accept /></Suspense>;
}

function Accept() {
  const next = useSearchParams().get("next") ?? "";
  return (
    <div className="mx-auto mt-[10vh] flex max-w-md flex-col gap-6 rounded-card bg-surface-2 p-8">
      <div>
        <h1 className="text-3xl font-light">Before you continue</h1>
        <p className="mt-2 text-sm text-muted">Please read and accept our <Link href="/legal/terms" target="_blank" className="underline hover:text-ink">Terms of Service</Link> and <Link href="/legal/privacy" target="_blank" className="underline hover:text-ink">Privacy Policy</Link>.</p>
      </div>
      <ActionForm action={acceptTerms}>
        {(pending) => (
          <>
            <input type="hidden" name="next" value={next} />
            <TermsConsent />
            <button disabled={pending} className={primaryBtn}>{pending ? "Saving…" : "Continue"}</button>
          </>
        )}
      </ActionForm>
      <form action={signOut}><button className="text-sm text-muted underline hover:text-ink">Sign out instead</button></form>
    </div>
  );
}
