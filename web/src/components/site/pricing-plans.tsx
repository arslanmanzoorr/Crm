"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BILLING_LIVE, PLANS, price, TRIAL_DAYS, YEARLY_MONTHS } from "@/lib/plans";
import { btnGhost, btnPrimary, S } from "@/lib/site-theme";

/** The three plans with a monthly / yearly switch. Prices are per agent; assistants are free. */
export function PricingPlans() {
  const [yearly, setYearly] = useState(false);
  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex w-fit items-center gap-1 rounded-[8px] p-1" style={{ background: S.panel }}>
        <legend className="sr-only">Billing period</legend>
        {[["Monthly", false], [`Yearly · ${12 - YEARLY_MONTHS} months free`, true]].map(([label, value]) => (
          <label key={String(value)} className={`flex min-h-11 cursor-pointer items-center rounded-[6px] px-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#111111] ${yearly === value ? "bg-[#111111] text-white" : ""}`}>
            <input type="radio" name="period" className="sr-only" checked={yearly === value} onChange={() => setYearly(value as boolean)} />
            {label as string}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 lg:grid-cols-3">
        {PLANS.map((p) => {
          const amount = price(p.monthly, yearly);
          const dark = "recommended" in p && p.recommended;
          return (
            <section key={p.key} aria-labelledby={`plan-${p.key}`} className={`flex flex-col gap-6 rounded-[8px] p-7 ${dark ? "bg-[#111111] text-white" : "bg-white ring-1 ring-black/10"}`}>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h2 id={`plan-${p.key}`} className="text-2xl font-bold tracking-tight">{p.name}</h2>
                  {dark && <span className="rounded-full px-3 py-1 text-xs font-semibold text-[#111111]" style={{ background: S.accent }}>Recommended</span>}
                </div>
                <p className={`mt-2 text-sm ${dark ? "text-white/70" : ""}`} style={dark ? undefined : { color: S.muted }}>{p.pitch}</p>
              </div>
              <p>
                <span className="text-5xl font-extrabold tracking-[-0.04em]">${amount}</span>
                <span className={`ml-2 text-sm ${dark ? "text-white/70" : ""}`} style={dark ? undefined : { color: S.muted }}>per agent / {yearly ? "year" : "month"}</span>
                {yearly && <span className={`mt-1 block text-sm ${dark ? "text-white/70" : ""}`} style={dark ? undefined : { color: S.muted }}>Same as ${(amount / 12).toFixed(2)} a month</span>}
              </p>
              <Link href="/login" className={`${dark ? btnPrimary : btnGhost} justify-center`}>
                {BILLING_LIVE ? `Start ${TRIAL_DAYS}-day trial` : "Create account"} {dark && <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />}
              </Link>
              <ul className="flex flex-col gap-2.5 text-sm">
                {p.includes.map((f) => (
                  <li key={f} className="flex gap-2.5"><Check aria-hidden className="mt-0.5 size-4 shrink-0" style={{ color: dark ? S.accent : S.accentText }} />{f}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
