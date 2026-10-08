"use client";

import { useActionState, type InputHTMLAttributes, type ReactNode } from "react";
import type { FormState } from "@/lib/actions";

export const input = "w-full rounded-2xl bg-surface-1 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent";
export const primaryBtn = "rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-light hover:bg-accent-strong disabled:opacity-60";

/** Form bound to a server action, showing its error/ok message. */
export function ActionForm({
  action,
  children,
  className = "flex flex-col gap-4",
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: (pending: boolean) => ReactNode;
  className?: string;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className={className}>
      {children(pending)}
      {state?.error && <p role="alert" className="text-sm text-score-1">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-accent">{state.ok}</p>}
    </form>
  );
}

export function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}{hint && <span className="text-xs"> · {hint}</span>}</span>
      <input className={input} {...props} />
    </label>
  );
}
