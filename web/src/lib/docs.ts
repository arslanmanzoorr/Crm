// Document upload rules, no I/O. The Storage bucket enforces the same limits; this gives a clear message first.

export const MAX_DOC_BYTES = 25 * 1024 * 1024;
export const DOC_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "Photo", "image/png": "Image", "image/webp": "Image", "image/heic": "Photo",
  "text/plain": "Text",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
};

/** A storage-safe file name that still reads like the original: "Seller Disclosure (signed).pdf" -> "Seller-Disclosure-signed.pdf". */
export function safeFileName(raw: string) {
  const name = raw.split(/[\\/]/).pop() ?? ""; // a name, never a path
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "document";
  return ext ? `${base}.${ext}` : base;
}

export function checkUpload(f: { name: string; size: number; type: string }): string | null {
  if (!f.name.trim()) return "The file needs a name.";
  if (f.size <= 0) return "That file is empty.";
  if (f.size > MAX_DOC_BYTES) return "Files can be up to 25 MB.";
  if (!(f.type in DOC_TYPES)) return "Upload a PDF, photo, Word, Excel or text file.";
  return null;
}

export const fileSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
