import { loadDemo } from "@/lib/actions";

export function EmptyDemo({ what }: { what: string }) {
  return (
    <form action={loadDemo} className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-8">
      <p>No {what} yet. Add your first one, or load the demo data to look around.</p>
      <button className="rounded-full bg-surface-light px-4 py-2 text-sm font-medium text-on-light hover:bg-white">Load demo data</button>
    </form>
  );
}
