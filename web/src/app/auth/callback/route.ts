import { redirect } from "next/navigation";
import { supabase } from "@/lib/db";
import { safeNext } from "@/lib/search";

/** Lands here from the sign-up confirmation email. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) await (await supabase()).auth.exchangeCodeForSession(code);
  redirect(safeNext(url.searchParams.get("next")));
}
