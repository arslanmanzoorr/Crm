import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-12 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Link href="/welcome" className="flex items-center gap-2.5 text-ink">
          <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-on-light">E</span>
          EstateOS
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/welcome#product" className="hover:text-ink">Product</Link>
          <Link href="/store" className="hover:text-ink">Store</Link>
          <Link href="/welcome#trust" className="hover:text-ink">Security</Link>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
        </nav>
        <p>&copy; {2026} EstateOS</p>
      </div>
    </footer>
  );
}
