"use client";

import { Download } from "lucide-react";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote per RFC 4180; prefix formula-looking cells so spreadsheets don't execute them.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Downloads the rows already on screen as a CSV file. */
export function CsvDownload({ name, header, rows }: { name: string; header: string[]; rows: unknown[][] }) {
  const save = () => {
    const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <button type="button" onClick={save} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink">
      <Download aria-hidden className="size-4" /> CSV
    </button>
  );
}
