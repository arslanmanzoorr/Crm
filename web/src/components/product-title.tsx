"use client";

import { useEffect } from "react";

/** On an agency's own domain, "EstateOS" in the tab title becomes the agency's name (titles come from page metadata). */
export function ProductTitle({ name }: { name: string }) {
  useEffect(() => {
    const fix = () => { if (document.title.includes("EstateOS")) document.title = document.title.replaceAll("EstateOS", name); };
    fix();
    const head = document.querySelector("head");
    const obs = new MutationObserver(fix);
    if (head) obs.observe(head, { subtree: true, childList: true, characterData: true });
    return () => obs.disconnect();
  }, [name]);
  return null;
}
