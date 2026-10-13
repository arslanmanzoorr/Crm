import { BrandStyle } from "@/components/brand-style";

export default function Layout({ children, params }: LayoutProps<"/p/[token]">) {
  return <>{children}<BrandStyle kind="portal" id={params.then((p) => p.token)} /></>;
}
