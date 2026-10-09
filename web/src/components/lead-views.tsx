import { KanbanSquare, List, Plus } from "lucide-react";
import Link from "next/link";

const seg = (on: boolean) =>
  `flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition duration-150 ${on ? "bg-surface-light text-on-light" : "text-muted hover:text-ink"}`;

/** List / Pipeline switch shared by both lead views, plus the add button. */
export function LeadViews({ current }: { current: "list" | "pipeline" }) {
  return (
    <div className="flex items-center gap-2">
      <nav aria-label="Lead views" className="flex rounded-full bg-surface-2 p-1">
        <Link href="/leads" aria-current={current === "list" ? "page" : undefined} className={seg(current === "list")}><List aria-hidden className="size-4" /> List</Link>
        <Link href="/pipeline" aria-current={current === "pipeline" ? "page" : undefined} className={seg(current === "pipeline")}><KanbanSquare aria-hidden className="size-4" /> Pipeline</Link>
      </nav>
      <Link href="/leads/import" className="hidden min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm text-muted hover:text-ink sm:flex">Import</Link>
      <Link href="/leads/new" aria-label="Add lead" className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-on-light hover:bg-accent-strong">
        <Plus aria-hidden className="size-4" /> <span className="hidden sm:inline">Add lead</span>
      </Link>
    </div>
  );
}
