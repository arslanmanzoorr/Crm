import { PauseCircle } from "lucide-react";
import { signOut } from "@/lib/actions";

/** Covers the app when this person's team was paused by its agency. The data is untouched; access returns on resume. */
export function Paused({ team, agency }: { team: string; agency: string | null }) {
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="paused-title" className="fixed inset-0 z-[70] grid place-items-center bg-bg p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-card bg-surface-2 p-8 text-center">
        <PauseCircle aria-hidden className="size-10 text-muted" />
        <h1 id="paused-title" className="text-2xl">{team} is paused</h1>
        <p className="text-muted">Your account is on hold{agency ? ` by ${agency}` : ""}. Everything is saved and comes back as soon as it&apos;s resumed. {agency ? `Contact ${agency} to sort it out.` : "Contact your account provider."}</p>
        <form action={signOut}><button className="min-h-11 rounded-full bg-surface-3 px-5 text-sm hover:bg-surface-light hover:text-on-light">Sign out</button></form>
      </div>
    </div>
  );
}
