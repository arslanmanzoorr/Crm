import { BrandStyle } from "@/components/brand-style";

export default function Layout({ children, params }: LayoutProps<"/f/[id]">) {
  return <>{children}<BrandStyle kind="form" id={params.then((p) => p.id)} /></>;
}
