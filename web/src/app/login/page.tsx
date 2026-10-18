import { headers } from "next/headers";
import { Suspense } from "react";
import { brandColorError } from "@/lib/brand";
import { getDomainBrand } from "@/lib/db";
import { Login } from "./login-form";
import { ProductTitle } from "@/components/product-title";

export default function LoginPage() {
  return (
    <Suspense>
      <Branded />
    </Suspense>
  );
}

async function Branded() {
  const host = ((await headers()).get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  const b = await getDomainBrand(host);
  return (
    <>
      {b && <ProductTitle name={b.name} />}
      <Login brand={b && { ...b, color: b.color && !brandColorError(b.color) ? b.color : null }} />
    </>
  );
}
