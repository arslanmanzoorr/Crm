import type { Metadata } from "next";
import Link from "next/link";
import { PropertyForm } from "@/components/property-form";

export const metadata: Metadata = { title: "New listing" };

export default function NewPropertyPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/properties" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All listings</Link>
      <h1 className="text-4xl font-light">New listing</h1>
      <PropertyForm />
    </div>
  );
}
