"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, Field, primaryBtn } from "@/components/forms";
import { authenticate, googleSignIn } from "@/lib/actions";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const next = useSearchParams().get("next") ?? "";
  const invited = next.startsWith("/invite/");
  return (
    <div className="mx-auto mt-[10vh] flex max-w-sm flex-col gap-6 rounded-card bg-surface-2 p-8">
      <div>
        <span className="grid size-11 place-items-center rounded-full bg-accent text-lg font-semibold text-on-light">E</span>
        <h1 className="mt-4 text-3xl font-light">Sign in to EstateOS</h1>
        {invited && <p className="mt-2 text-sm text-muted">Sign in or create an account with the email your invite was sent to.</p>}
      </div>
      <ActionForm action={googleSignIn}>
        {(pending) => (
          <>
            <input type="hidden" name="next" value={next} />
            <button disabled={pending} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60">
              <svg aria-hidden viewBox="0 0 48 48" className="size-5"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
              {pending ? "Opening Google…" : "Continue with Google"}
            </button>
          </>
        )}
      </ActionForm>
      <p className="-my-2 text-center text-xs text-muted">or with email</p>
      <ActionForm action={authenticate}>
        {(pending) => (
          <>
            <input type="hidden" name="next" value={next} />
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Field label="Password" name="password" type="password" autoComplete="current-password" minLength={8} required />
            <div className="flex gap-2">
              <button name="mode" value="signin" disabled={pending} className={primaryBtn}>Sign in</button>
              <button name="mode" value="signup" disabled={pending} className="min-h-11 rounded-full bg-surface-light px-5 text-sm font-medium text-on-light hover:bg-white disabled:opacity-60">
                Create account
              </button>
            </div>
          </>
        )}
      </ActionForm>
    </div>
  );
}
