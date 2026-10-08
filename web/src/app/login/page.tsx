"use client";

import { ActionForm, Field, primaryBtn } from "@/components/forms";
import { authenticate } from "@/lib/actions";

export default function LoginPage() {
  return (
    <div className="mx-auto mt-[10vh] flex max-w-sm flex-col gap-6 rounded-card bg-surface-2 p-8">
      <div>
        <span className="grid size-11 place-items-center rounded-full bg-accent text-lg font-semibold text-on-light">E</span>
        <h1 className="mt-4 text-3xl font-light">Sign in to EstateOS</h1>
      </div>
      <ActionForm action={authenticate}>
        {(pending) => (
          <>
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Field label="Password" name="password" type="password" autoComplete="current-password" minLength={8} required />
            <div className="flex gap-2">
              <button name="mode" value="signin" disabled={pending} className={primaryBtn}>Sign in</button>
              <button name="mode" value="signup" disabled={pending} className="rounded-full bg-surface-light px-5 py-2.5 text-sm font-medium text-on-light hover:bg-white disabled:opacity-60">
                Create account
              </button>
            </div>
          </>
        )}
      </ActionForm>
    </div>
  );
}
