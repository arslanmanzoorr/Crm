import Link from "next/link";

/**
 * The two separate choices behind an account: agreeing to the Terms and Privacy Policy (required, never pre-ticked)
 * and product emails (optional, never pre-ticked, not a condition of anything).
 */
export function TermsConsent({ required = true }: { required?: boolean }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex items-start gap-3">
        <input type="checkbox" name="agree" required={required} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
        <span>
          I agree to the <Link href="/legal/terms" target="_blank" className="underline hover:text-ink">Terms of Service</Link> and
          the <Link href="/legal/privacy" target="_blank" className="underline hover:text-ink">Privacy Policy</Link>.
          {!required && <span className="text-muted"> Needed to create an account.</span>}
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="marketing" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
        <span className="text-muted">Email me product news and tips (optional, unsubscribe any time).</span>
      </label>
    </div>
  );
}
