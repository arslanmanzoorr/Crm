import Link from "next/link";
import { LeadForm } from "@/components/lead-form";

export default function NewLeadPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/leads" className="text-sm text-muted hover:text-accent">← All leads</Link>
      <h1 className="text-4xl font-light">New lead</h1>
      <LeadForm />
    </div>
  );
}
