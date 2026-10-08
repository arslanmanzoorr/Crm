import { redirect } from "next/navigation";
import { supabase } from "@/lib/db";

/** Lands here from the sign-up confirmation email. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (code) await (await supabase()).auth.exchangeCodeForSession(code);
  redirect("/");
}
