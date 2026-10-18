import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { Watchdog } from "@/components/watchdog";
import { Tour } from "@/components/tour";
import { AgencyBar } from "@/components/agency-bar";
import { ProductTitle } from "@/components/product-title";
import { Paused } from "@/components/paused";
import { getAppBrand, getPausedNotice } from "@/lib/db";
import { themeCss } from "@/lib/theme";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const viewport: Viewport = { themeColor: "#0e0e0e", viewportFit: "cover", colorScheme: "dark" };

export const metadata: Metadata = {
  title: { template: "%s · EstateOS", default: "EstateOS" },
  description: "The CRM for real estate agents: leads, follow-ups, listings and marketing in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${urbanist.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <a href="#main" className="sr-only rounded-full bg-accent px-4 py-2 text-on-light focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
          Skip to content
        </a>
        <div className="flex min-h-screen">
          <Suspense fallback={<div className="md:w-20" />}>
            <Shell />
          </Suspense>
          <main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 md:pb-8">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

/** The team's theme (validated CSS variables), logo and switched-off modules around the navigation. */
async function Shell() {
  const b = await getAppBrand();
  if (!b) {
    const paused = await getPausedNotice();
    if (paused) return <Paused team={paused.team} agency={paused.agency} />;
  }
  const css = b ? themeCss(b.color, b.radius, b.theme) : "";
  return (
    <>
      {css && <style>{css}</style>}
      <Sidebar logo={b?.logo} team={b?.name} off={b?.off} agency={!!b?.agency} />
      {b?.viaAgency && b.agency && <AgencyBar agency={b.agency.name} team={b.name} />}
      {b?.product && <ProductTitle name={b.product} />}
      {b && <Watchdog />}
      {b && <Tour state={b.tour} role={b.role} off={b.off} team={b.name} />}
    </>
  );
}
