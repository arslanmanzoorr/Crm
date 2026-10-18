"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useActionState, type InputHTMLAttributes, type ReactNode } from "react";
import type { FormState } from "@/lib/actions";

// Class strings live in a plain module so Server Components get the strings, not client references.
import { input, inputAuto, primaryBtn } from "./form-classes";
export { input, inputAuto, primaryBtn };

// Status colors per surface; each ≥4.5:1 on its background.
const tones = {
  dark: { error: "text-score-1", ok: "text-accent-ink" },
  light: { error: "text-[#b42318]", ok: "text-[#3f6212]" },
};

/** Form bound to a server action. Shows its result next to the controls, announced to screen readers. */
export function ActionForm({
  action,
  children,
  className = "flex flex-col gap-4",
  tone = "dark",
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: (pending: boolean) => ReactNode;
  className?: string;
  tone?: keyof typeof tones;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const c = tones[tone];
  return (
    <form action={run} className={className}>
      {children(pending)}
      <div aria-live="polite" className="basis-full empty:hidden">
        {state?.error && (
          <p role="alert" className={`flex animate-rise items-start gap-1.5 text-sm ${c.error}`}>
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className={`flex animate-rise items-start gap-1.5 text-sm ${c.ok}`}>
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            {state.ok}
          </p>
        )}
      </div>
    </form>
  );
}

export function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">
        {label}
        {props.required && <span className="text-ink"> *</span>}
        {hint && <span className="text-xs"> · {hint}</span>}
      </span>
      <input className={input} {...props} />
    </label>
  );
}
