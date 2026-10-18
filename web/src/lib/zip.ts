// Minimal streaming ZIP writer on Node's zlib (deflate + crc32), so a full export needs no dependency.
// Each file is compressed in memory, then emitted; the central directory is written at the end.
// ponytail: no ZIP64, so an export must stay under 4 GB and 65,535 files; streaming per-file is fine below that.
import { crc32, deflateRawSync } from "node:zlib";

const enc = new TextEncoder();

export class ZipWriter {
  private entries: { name: Uint8Array; crc: number; size: number; csize: number; offset: number; method: number }[] = [];
  private offset = 0;
  private time: number;
  private date: number;

  constructor(now = new Date()) {
    this.time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    this.date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  }

  /** Returns the bytes for one file entry (local header + data). Already-compressed media is stored as-is. */
  add(name: string, data: Uint8Array | string): Uint8Array {
    const raw = typeof data === "string" ? enc.encode(data) : data;
    const store = /\.(jpe?g|png|webp|avif|gif|pdf|zip|mp4|heic)$/i.test(name);
    const body = store ? raw : new Uint8Array(deflateRawSync(raw));
    const n = enc.encode(name);
    const e = { name: n, crc: crc32(raw), size: raw.length, csize: body.length, offset: this.offset, method: store ? 0 : 8 };
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, e.method, true);
    h.setUint16(10, this.time, true); h.setUint16(12, this.date, true); h.setUint32(14, e.crc, true);
    h.setUint32(18, e.csize, true); h.setUint32(22, e.size, true); h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
    const out = concat([new Uint8Array(h.buffer), n, body]);
    this.entries.push(e);
    this.offset += out.length;
    return out;
  }

  /** The central directory and end record; call once after the last add(). */
  finish(): Uint8Array {
    const start = this.offset;
    const parts = this.entries.map((e) => {
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, e.method, true); c.setUint16(12, this.time, true); c.setUint16(14, this.date, true); c.setUint32(16, e.crc, true);
      c.setUint32(20, e.csize, true); c.setUint32(24, e.size, true); c.setUint16(28, e.name.length, true); c.setUint32(42, e.offset, true);
      return concat([new Uint8Array(c.buffer), e.name]);
    });
    const dir = concat(parts);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, this.entries.length, true); end.setUint16(10, this.entries.length, true);
    end.setUint32(12, dir.length, true); end.setUint32(16, start, true);
    return concat([dir, new Uint8Array(end.buffer)]);
  }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

/** RFC 4180 CSV with formula-looking cells defused, so a spreadsheet never runs them. Columns = union of keys. */
export function toCsv(rows: Record<string, unknown>[]): string {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}
