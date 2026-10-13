"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, Field, primaryBtn } from "@/components/forms";
import { mfaVerify, signOut } from "@/lib/actions";

export default function MfaPage() {
  return <Suspense><Mfa /></Suspense>;
}

function Mfa() {
  const next = useSearchParams().get("next") ?? "";
  return (
    <div className="mx-auto mt-[10vh] flex max-w-sm flex-col gap-6 rounded-card bg-surface-2 p-8">
      <div>
        <h1 className="text-3xl font-light">Enter your code</h1>
        <p className="mt-2 text-sm text-muted">Open your authenticator app and type the 6-digit code for EstateOS.</p>
      </div>
      <ActionForm action={mfaVerify}>
        {(pending) => (
          <>
            <input type="hidden" name="next" value={next} />
            <Field label="Code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus />
            <button disabled={pending} className={primaryBtn}>{pending ? "Checking…" : "Continue"}</button>
          </>
        )}
      </ActionForm>
      <form action={signOut}><button className="text-sm text-muted underline hover:text-ink">Sign out</button></form>
    </div>
  );
}
