import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

/** Replaces Next's default 404, which forces a white page under the dark app shell. */
export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-4xl font-light">Page not found</h1>
      <p className="text-muted">This page doesn&apos;t exist, or it was moved or deleted.</p>
      <Link href="/" className="flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-on-light hover:bg-accent-strong">Back to Today</Link>
    </div>
  );
}
