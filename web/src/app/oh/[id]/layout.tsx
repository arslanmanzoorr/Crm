import { BrandStyle } from "@/components/brand-style";

export default function Layout({ children, params }: LayoutProps<"/oh/[id]">) {
  return <>{children}<BrandStyle kind="oh" id={params.then((p) => p.id)} /></>;
}
