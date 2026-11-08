import type { ReactNode } from "react";

/** Re-mounts on every navigation, so each page's sections replay their entrance (`.page-in` in globals.css). */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
