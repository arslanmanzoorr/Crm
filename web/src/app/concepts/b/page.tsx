import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Daylight } from "@/components/concepts/daylight";

const font = Geist({ subsets: ["latin"], weight: ["400", "500", "600"] });
export const metadata: Metadata = { title: { absolute: "Concept B: Daylight Editorial · EstateOS" }, robots: { index: false } };

export default function ConceptB() {
  return <Daylight font={font.className} />;
}
