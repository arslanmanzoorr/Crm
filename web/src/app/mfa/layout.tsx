import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign-in code" };

export default function MfaLayout({ children }: LayoutProps<"/mfa">) {
  return children;
}
