import assert from "node:assert/strict";
import { test } from "node:test";
import { checkUpload, fileSize, safeFileName } from "./docs.ts";

test("safeFileName keeps it readable and storage-safe", () => {
  assert.equal(safeFileName("Seller Disclosure (signed).PDF"), "Seller-Disclosure-signed.pdf");
  assert.equal(safeFileName("../../etc/passwd"), "passwd");
  assert.equal(safeFileName("C:\\Users\\x\\offer.pdf"), "offer.pdf");
  assert.equal(safeFileName("Résumé finál.docx"), "Resume-final.docx");
  assert.equal(safeFileName("....pdf"), "document.pdf");
  assert.equal(safeFileName("noext"), "noext");
});

test("checkUpload explains what's wrong", () => {
  assert.equal(checkUpload({ name: "a.pdf", size: 1000, type: "application/pdf" }), null);
  assert.equal(checkUpload({ name: "a.pdf", size: 30 * 1024 * 1024, type: "application/pdf" }), "Files can be up to 25 MB.");
  assert.equal(checkUpload({ name: "a.exe", size: 10, type: "application/x-msdownload" }), "Upload a PDF, photo, Word, Excel or text file.");
  assert.equal(checkUpload({ name: "a.pdf", size: 0, type: "application/pdf" }), "That file is empty.");
});

test("fileSize", () => {
  assert.equal(fileSize(500), "1 KB");
  assert.equal(fileSize(2.5 * 1024 * 1024), "2.5 MB");
});
