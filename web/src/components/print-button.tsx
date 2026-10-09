"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => print()} className="flex min-h-11 items-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-medium text-white print:hidden">
      <Printer aria-hidden className="size-4" /> Print
    </button>
  );
}
