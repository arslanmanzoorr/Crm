import Link from "next/link";
import { PropertyForm } from "@/components/property-form";

export default function NewPropertyPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/properties" className="text-sm text-muted hover:text-accent">← All properties</Link>
      <h1 className="text-4xl font-light">New listing</h1>
      <PropertyForm />
    </div>
  );
}
