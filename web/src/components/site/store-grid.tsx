"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { StoreItem } from "@/lib/store";
import { PlaybookPreview } from "./playbook-preview";
import { LiftCard } from "./signal";
import { S } from "@/lib/site-theme";

/** Category filter + grid. Cards glide to their new places when the filter changes (layout animation). */
export function StoreGrid({ items, categories }: { items: StoreItem[]; categories: string[] }) {
  const [cat, setCat] = useState("All");
  const reduce = useReducedMotion();
  const shown = cat === "All" ? items : items.filter((i) => i.category === cat);
  return (
    <LayoutGroup>
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
        {["All", ...categories].map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}
            className={`relative min-h-10 rounded-[6px] px-4 text-sm font-medium transition-colors ${cat === c ? "text-white" : "bg-[#e8e8e8] text-[#111111] hover:bg-[#dedede]"}`}>
            {cat === c && <motion.span layoutId={reduce ? undefined : "store-pill"} className="absolute inset-0 rounded-[6px] bg-[#111111]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{c}</span>
          </button>
        ))}
      </div>
      <motion.ul layout={!reduce} className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((item) => (
            <motion.li key={item.key} layout={!reduce} initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
              <LiftCard href={`/store/${item.key}`} className="gap-6">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold" style={{ color: S.accentText }}>{item.category}</p>
                  <span className="rounded-[4px] bg-[#e8e8e8] px-2 py-0.5 text-xs font-semibold">Free</span>
                </div>
                <h2 className="-mt-3 text-xl leading-snug font-bold">{item.name}</h2>
                <PlaybookPreview item={item} />
                <div className="mt-auto flex items-center justify-between text-sm" style={{ color: S.muted }}>
                  <span>{item.taskCount} task{item.taskCount === 1 ? "" : "s"} over {item.span.toLowerCase()}</span>
                  <ArrowRight aria-hidden className="size-4 text-[#111111] transition-transform group-hover:translate-x-0.5" />
                </div>
              </LiftCard>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </LayoutGroup>
  );
}
