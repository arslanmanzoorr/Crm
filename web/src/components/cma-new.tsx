"use client";

import { useState } from "react";
import { createCma } from "@/lib/actions";
import { ActionForm, input, primaryBtn } from "./forms";

export function NewCma({ listings }: { listings: { id: string; address: string }[] }) {
  const [listing, setListing] = useState("");
  return (
    <ActionForm action={createCma} className="grid gap-3 sm:grid-cols-2">
      {(pending) => (
        <>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2"><span className="text-muted">Home</span>
            <select name="property_id" value={listing} onChange={(e) => setListing(e.target.value)} className={input}>
              <option value="">A home that isn&apos;t listed with us yet</option>
              {listings.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </label>
          {!listing && (
            <>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2"><span className="text-muted">Address</span><input name="address" required maxLength={300} autoComplete="off" className={input} /></label>
              <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Sqft</span><input name="sqft" type="number" min={0} className={input} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Beds</span><input name="beds" type="number" min={0} className={input} /></label>
                <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Baths</span><input name="baths" type="number" min={0} step={0.25} className={input} /></label>
              </div>
            </>
          )}
          <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Starting…" : "Start CMA"}</button>
        </>
      )}
    </ActionForm>
  );
}
