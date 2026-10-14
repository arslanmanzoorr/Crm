import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { Aurora } from "@/components/concepts/aurora";

const font = Sora({ subsets: ["latin"], weight: ["300", "400", "500"] });
export const metadata: Metadata = { title: { absolute: "Concept C: Aurora Depth · EstateOS" }, robots: { index: false } };

export default function ConceptC() {
  return <Aurora font={font.className} />;
}
