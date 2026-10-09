/** RFC 4180 CSV: quoted fields, escaped quotes (""), commas and newlines inside quotes, CRLF or LF, optional BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

export const LEAD_FIELDS = ["name", "first", "last", "email", "phone", "type", "source", "budget", "areas", "notes"] as const;
export type LeadField = (typeof LEAD_FIELDS)[number];

// Header spellings seen in common CRM / portal / contacts exports.
const ALIASES: Record<LeadField, string[]> = {
  name: ["name", "full name", "fullname", "contact name", "contact", "lead name", "display name"],
  first: ["first", "first name", "firstname", "given name"],
  last: ["last", "last name", "lastname", "surname", "family name"],
  email: ["email", "e-mail", "email address", "primary email", "e-mail 1 - value", "email 1"],
  phone: ["phone", "phone number", "mobile", "cell", "mobile phone", "primary phone", "phone 1 - value", "phone 1", "telephone"],
  type: ["type", "lead type", "contact type", "role"],
  source: ["source", "lead source", "origin", "channel"],
  budget: ["budget", "price range", "price", "max price"],
  areas: ["areas", "area", "neighborhood", "neighborhoods", "city", "location", "zip"],
  notes: ["notes", "note", "comments", "message", "description"],
};

const norm = (h: string) => h.toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();

/** Best-guess column for each field from the header row; unmatched fields map to -1. */
export function guessMapping(header: string[]): Record<LeadField, number> {
  const cols = header.map(norm);
  const out = {} as Record<LeadField, number>;
  for (const f of LEAD_FIELDS) out[f] = cols.findIndex((c) => ALIASES[f].includes(c));
  return out;
}

export type ImportRow = { name: string; email: string; phone: string; type: string; source: string; budget: string; areas: string[]; notes: string };

const TYPES = ["buyer", "seller", "renter", "investor", "landlord", "vendor"];

/** Turns raw cells into a clean row, or a reason it can't be imported. */
export function toImportRow(cells: string[], map: Record<LeadField, number>): ImportRow | { error: string } {
  const get = (f: LeadField) => (map[f] >= 0 ? (cells[map[f]] ?? "").trim() : "");
  const name = (get("name") || [get("first"), get("last")].filter(Boolean).join(" ")).replace(/[<>]/g, "").slice(0, 200);
  const email = get("email").toLowerCase().slice(0, 320);
  const phone = get("phone").replace(/[^0-9+]/g, "").slice(0, 20);
  if (!name) return { error: "Missing name" };
  if (!email && !phone) return { error: "Needs an email or phone" };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: `Invalid email “${email}”` };
  const t = get("type").toLowerCase();
  return {
    name,
    email,
    phone,
    type: TYPES.includes(t) ? t : "buyer",
    source: get("source").slice(0, 40) || "Import",
    budget: get("budget").slice(0, 100),
    areas: get("areas").split(/[;,|]/).map((a) => a.trim()).filter(Boolean).slice(0, 20),
    notes: get("notes").slice(0, 2000),
  };
}
