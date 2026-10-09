"use client";

import { CircleAlert, CircleCheck, FileUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { importLeads } from "@/lib/actions";
import { LEAD_FIELDS, guessMapping, parseCsv, toImportRow, type ImportRow, type LeadField } from "@/lib/csv";
import { input, primaryBtn } from "./forms";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;
const CHUNK = 500;

const LABELS: Record<LeadField, string> = {
  name: "Full name", first: "First name", last: "Last name", email: "Email", phone: "Phone",
  type: "Type (buyer, seller…)", source: "Source", budget: "Budget", areas: "Areas", notes: "Notes",
};

type Done = { created: number; duplicates: number; invalid: number };

export function LeadImport() {
  const [file, setFile] = useState<{ name: string; header: string[]; body: string[][] } | null>(null);
  const [map, setMap] = useState<Record<LeadField, number> | null>(null);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Done | null>(null);

  async function choose(f: File | undefined) {
    setErr("");
    setResult(null);
    if (!f) return;
    if (f.size > MAX_BYTES) return setErr("That file is over 5 MB. Split it into smaller files.");
    const rows = parseCsv(await f.text());
    if (rows.length < 2) return setErr("That file has no rows under the header.");
    if (rows.length - 1 > MAX_ROWS) return setErr(`Up to ${MAX_ROWS.toLocaleString()} leads per import. Split the file.`);
    setFile({ name: f.name, header: rows[0], body: rows.slice(1) });
    setMap(guessMapping(rows[0]));
  }

  // Validate every row, then mark repeats of an email or phone seen earlier in the same file.
  const checked = useMemo(() => {
    if (!file || !map) return [];
    const seen = new Set<string>();
    return file.body.map((cells) => {
      const row = toImportRow(cells, map);
      if ("error" in row) return row;
      const keys = [row.email && `e:${row.email}`, row.phone && `p:${row.phone}`].filter(Boolean) as string[];
      if (keys.some((k) => seen.has(k))) return { error: "Duplicate of an earlier row" };
      keys.forEach((k) => seen.add(k));
      return row;
    });
  }, [file, map]);
  const valid = checked.filter((r): r is ImportRow => !("error" in r));
  const hasName = map && (map.name >= 0 || map.first >= 0);
  const hasContact = map && (map.email >= 0 || map.phone >= 0);

  async function run() {
    setErr("");
    const total = { created: 0, duplicates: 0, invalid: checked.length - valid.length };
    setProgress({ done: 0, total: valid.length });
    try {
      for (let i = 0; i < valid.length; i += CHUNK) {
        const r = await importLeads(valid.slice(i, i + CHUNK), consent);
        total.created += r.created;
        total.duplicates += r.duplicates;
        total.invalid += r.invalid;
        setProgress({ done: Math.min(valid.length, i + CHUNK), total: valid.length });
      }
      setResult(total);
      setFile(null);
    } catch (e) {
      setErr(`${(e as Error).message} ${total.created ? `${total.created} leads were imported before it stopped.` : ""}`);
    } finally {
      setProgress(null);
    }
  }

  if (result)
    return (
      <div className="flex animate-rise flex-col items-start gap-3 rounded-card bg-surface-2 p-6">
        <CircleCheck aria-hidden className="size-8 text-accent" />
        <h2 className="text-2xl">Imported {result.created.toLocaleString()} lead{result.created === 1 ? "" : "s"}</h2>
        <p className="text-sm text-muted">
          {result.duplicates > 0 && `${result.duplicates} skipped as duplicates (same email or phone). `}
          {result.invalid > 0 && `${result.invalid} skipped for missing or invalid details.`}
        </p>
        <div className="flex gap-2">
          <Link href="/leads" className={`${primaryBtn} flex items-center`}>View leads</Link>
          <button type="button" onClick={() => setResult(null)} className="min-h-11 rounded-full bg-surface-3 px-5 text-sm">Import another file</button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-white/10 p-8 text-center text-sm text-muted transition hover:border-accent hover:text-accent has-[:focus-visible]:border-accent">
        <FileUp aria-hidden className="size-8" />
        <span>{file ? `${file.name} · ${file.body.length.toLocaleString()} rows` : "Choose a CSV file"}</span>
        <span className="text-xs">Exports from Follow Up Boss, kvCORE, Zillow, Google Contacts or a spreadsheet work. Up to 10,000 rows.</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {file && map && (
        <>
          <section aria-labelledby="mapping" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
            <h2 id="mapping" className="text-xl">Match your columns</h2>
            <p className="text-sm text-muted">We guessed from your header row. Fix anything that&apos;s wrong.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {LEAD_FIELDS.map((f) => (
                <label key={f} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 text-muted">{LABELS[f]}</span>
                  <select value={map[f]} onChange={(e) => setMap({ ...map, [f]: Number(e.target.value) })} className={input}>
                    <option value={-1}>Not in file</option>
                    {file.header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {!hasName && <p className="flex items-center gap-1.5 text-sm text-score-1"><CircleAlert aria-hidden className="size-4" /> Pick a name column (full name, or first and last).</p>}
            {!hasContact && <p className="flex items-center gap-1.5 text-sm text-score-1"><CircleAlert aria-hidden className="size-4" /> Pick an email or phone column.</p>}
          </section>

          <section aria-labelledby="preview" className="flex flex-col gap-3">
            <h2 id="preview" className="text-xl">
              Preview <span className="text-sm text-muted">{valid.length.toLocaleString()} ready · {(checked.length - valid.length).toLocaleString()} with problems</span>
            </h2>
            <div className="overflow-x-auto rounded-card bg-surface-2">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>{["Name", "Email", "Phone", "Type", "Source", "Status"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-normal">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {checked.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-t border-white/5">
                      {"error" in r ? (
                        <><td colSpan={5} className="px-4 py-2.5 text-muted">{file.body[i].slice(0, 3).join(", ")}</td><td className="px-4 py-2.5 text-score-1">{r.error}</td></>
                      ) : (
                        <>
                          <td className="px-4 py-2.5">{r.name}</td><td className="px-4 py-2.5">{r.email}</td><td className="px-4 py-2.5">{r.phone}</td>
                          <td className="px-4 py-2.5">{r.type}</td><td className="px-4 py-2.5">{r.source}</td><td className="px-4 py-2.5 text-accent">Ready</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              {checked.length > 8 && `Showing the first 8 of ${checked.length.toLocaleString()} rows. `}
              Leads whose email or phone is already in EstateOS are skipped automatically.
            </p>
          </section>

          <label className="flex gap-3 rounded-card bg-surface-2 p-5 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
            <span>
              These contacts agreed to be called, texted and emailed by me, and I keep a record of that consent.
              <span className="mt-1 block text-xs text-muted">Leave this unticked if you&apos;re not sure. Contact buttons stay off for imported leads until consent is recorded on each lead (TCPA / CAN-SPAM).</span>
            </span>
          </label>

          {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={run} disabled={!valid.length || !hasName || !hasContact || !!progress} className={primaryBtn}>
              {progress ? `Importing ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()}…` : `Import ${valid.length.toLocaleString()} leads`}
            </button>
            <button type="button" onClick={() => { setFile(null); setMap(null); }} disabled={!!progress} className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-ink">Cancel</button>
          </div>
        </>
      )}
      {!file && err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </div>
  );
}
