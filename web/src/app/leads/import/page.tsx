import type { Metadata } from "next";
import Link from "next/link";
import { LeadImport } from "@/components/lead-import";

export const metadata: Metadata = { title: "Import leads" };

export default function ImportPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/leads" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All leads</Link>
      <h1 className="text-4xl font-light">Import leads</h1>
      <LeadImport />
    </div>
  );
}
