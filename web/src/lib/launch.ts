// Listing launch checklist, no I/O: each step is "done" only from what's actually in the system.

import { checkFairHousing } from "./fairhousing.ts";

export type LaunchFacts = {
  photos: number; description: string; approved: boolean; mlsId: string | null; rent: boolean;
  openHouses: number; promoSent: boolean;
};

export function launchChecklist(f: LaunchFacts) {
  const fh = checkFairHousing(f.description).filter((x) => x.level === "high").length;
  return [
    { key: "photos", label: "At least 10 photos", done: f.photos >= 10, hint: `${f.photos} so far` },
    { key: "description", label: "Description written, Fair Housing clean", done: f.description.trim().length >= 200 && fh === 0, hint: fh ? `${fh} phrase${fh === 1 ? "" : "s"} to fix` : "200+ characters" },
    { key: "approved", label: "Approved by the broker", done: f.approved, hint: "" },
    ...(f.rent ? [] : [{ key: "mls", label: "On the MLS (number added)", done: !!f.mlsId, hint: "Portals pick it up from there" }]),
    { key: "openhouse", label: "Open house scheduled", done: f.openHouses > 0, hint: "" },
    { key: "promo", label: `${f.rent ? "For rent" : "Just listed"} note sent to buyers who fit`, done: f.promoSent, hint: "" },
  ];
}
