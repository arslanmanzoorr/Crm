"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import type { StoreItem } from "@/lib/store";
import { PlaybookPreview } from "./playbook-preview";
import { SpotlightCard } from "./motion";

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
            className={`relative min-h-10 rounded-full px-4 text-sm transition-colors ${cat === c ? "text-on-light" : "text-ink/70 hover:text-ink"}`}>
            {cat === c && <motion.span layoutId={reduce ? undefined : "store-pill"} className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{c}</span>
          </button>
        ))}
      </div>
      <motion.ul layout={!reduce} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((item) => (
            <motion.li key={item.key} layout={!reduce} initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
              <SpotlightCard className="h-full rounded-[28px]">
                <Link href={`/store/${item.key}`} className="relative flex h-full flex-col gap-6 rounded-[28px] border border-white/8 bg-surface-2/70 p-7 transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-accent">{item.category}</p>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-ink/70">Free</span>
                  </div>
                  <h2 className="-mt-3 text-xl leading-snug">{item.name}</h2>
                  <PlaybookPreview item={item} />
                  <div className="mt-auto flex items-center justify-between text-sm text-ink/60">
                    <span>{item.taskCount} task{item.taskCount === 1 ? "" : "s"} over {item.span.toLowerCase()}</span>
                    <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </SpotlightCard>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </LayoutGroup>
  );
}
