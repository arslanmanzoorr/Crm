import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Signal } from "@/components/concepts/signal";

const font = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
export const metadata: Metadata = { title: { absolute: "Concept D: Signal Mono · EstateOS" }, robots: { index: false } };

export default function ConceptD() {
  return <Signal font={font.className} />;
}
