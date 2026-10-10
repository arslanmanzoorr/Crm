"use client";

import { Check, Copy, LogOut, UserMinus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { inviteMember, removeMember, renameOrg, revokeInvite, setInRotation, setMemberRole, setRouting, switchOrg } from "@/lib/actions";
import type { Member, Role, Team } from "@/lib/db";
import { US_TIME_ZONES } from "@/lib/showings";
import { ActionForm, Field, input, primaryBtn, inputAuto } from "./forms";
import { LocalTime } from "./local-time";
import { Avatar } from "./ui";

const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including roles and billing",
  admin: "Manages the team, forms and audit log",
  agent: "Works leads, listings and tasks",
  assistant: "Same access as an agent, for support staff",
};

function Armed({ label, confirm, onConfirm, icon }: { label: string; confirm: string; onConfirm: () => void; icon: React.ReactNode }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm transition ${armed ? "bg-score-1 font-medium text-on-light" : "text-score-1 hover:bg-surface-3"}`}
    >
      {icon} {armed ? confirm : label}
    </button>
  );
}

export function TeamManager({ team, routing, siteUrl }: { team: Team; routing: { members: Member[]; routing: "off" | "round_robin" }; siteUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  // Switching or leaving a team changes every page's data: start fresh from the workspace.
  const goHome = () => { router.push("/"); router.refresh(); };
  const [copied, setCopied] = useState<string | null>(null);
  const isOwner = team.me.role === "owner";
  const isAdmin = isOwner || team.me.role === "admin";
  const run = (fn: () => Promise<void>) => { setErr(""); start(async () => { try { await fn(); } catch (e) { setErr((e as Error).message); } }); };
  const copy = async (id: string) => { await navigator.clipboard.writeText(`${siteUrl}/invite/${id}`); setCopied(id); setTimeout(() => setCopied(null), 1800); };

  return (
    <div className="flex flex-col gap-8">
      {team.orgs.length > 1 && (
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">Working in</span>
          <select value={team.org.id} disabled={pending} onChange={(e) => { const id = e.target.value; run(async () => { await switchOrg(id); goHome(); }); }} className={inputAuto}>
            {team.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
      )}

      {isAdmin ? (
        <ActionForm action={renameOrg} className="flex flex-wrap items-end gap-3">
          {(p) => (
            <>
              <div className="min-w-56 flex-1"><Field label="Team name" name="name" defaultValue={team.org.name} maxLength={200} required /></div>
              <label className="flex min-w-48 flex-col gap-1.5 text-sm"><span className="text-muted">Time zone <span className="text-xs">· online booking hours</span></span>
                <select name="time_zone" defaultValue={team.org.timeZone ?? ""} className={input}>
                  <option value="">Visitor&apos;s own clock</option>
                  {Object.entries(US_TIME_ZONES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <button disabled={p} className={primaryBtn}>{p ? "Saving…" : "Save"}</button>
            </>
          )}
        </ActionForm>
      ) : team.orgs.length > 1 ? null : (
        <p className="text-2xl">{team.org.name}</p>
      )}

      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="text-xl">Members <span className="text-sm text-muted">{team.members.length}</span></h2>
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {team.members.map((m) => {
            const me = m.userId === team.me.userId;
            return (
              <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar name={m.email} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.email}{me && <span className="font-normal text-muted"> (you)</span>}</p>
                  <p className="text-xs text-muted">{ROLE_HELP[m.role]} · joined <LocalTime ts={m.joined} opts={{ month: "short", day: "numeric", year: "numeric" }} /></p>
                </div>
                {isOwner && !me && m.role !== "owner" ? (
                  <label>
                    <span className="sr-only">Role for {m.email}</span>
                    <select value={m.role} disabled={pending} onChange={(e) => run(() => setMemberRole(m.userId, e.target.value))} className={`${inputAuto} capitalize`}>
                      {(["admin", "agent", "assistant"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                ) : (
                  <span className="rounded-full bg-surface-3 px-3 py-1 text-xs capitalize">{m.role}</span>
                )}
                {m.role !== "owner" && me && <Armed label="Leave team" confirm="Leave?" icon={<LogOut aria-hidden className="size-4" />} onConfirm={() => run(async () => { await removeMember(m.userId); goHome(); })} />}
                {m.role !== "owner" && !me && isAdmin && <Armed label="Remove" confirm={`Remove ${m.email.split("@")[0]}?`} icon={<UserMinus aria-hidden className="size-4" />} onConfirm={() => run(() => removeMember(m.userId))} />}
              </li>
            );
          })}
        </ul>
      </section>

      {isAdmin && team.members.length > 1 && (
        <section aria-labelledby="routing" className="flex flex-col gap-3">
          <h2 id="routing" className="text-xl">Lead routing</h2>
          <label className="flex items-start gap-3 rounded-card bg-surface-2 p-4 text-sm">
            <input type="checkbox" defaultChecked={routing.routing === "round_robin"} disabled={pending}
              onChange={(e) => { const on = e.target.checked; run(() => setRouting(on)); }}
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
            <span>
              Round-robin new web-form leads
              <span className="block text-xs text-muted">Each new lead without an owner goes to the person in the rotation who has waited longest. Assistants are never assigned.</span>
            </span>
          </label>
          {routing.routing === "round_robin" && (
            <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
              {routing.members.filter((m) => m.role !== "assistant").map((m) => (
                <li key={m.userId}>
                  <label className="flex min-h-12 items-center gap-3 px-4 text-sm">
                    <input type="checkbox" defaultChecked={m.inRotation} disabled={pending}
                      onChange={(e) => { const on = e.target.checked; run(() => setInRotation(m.userId, on)); }}
                      className="size-5 accent-[var(--color-accent)]" />
                    <span className="flex-1 truncate">{m.email}</span>
                    <span className="text-xs text-muted">{m.inRotation ? "In rotation" : "Paused"}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isAdmin && (
        <section aria-labelledby="invite" className="flex flex-col gap-3">
          <h2 id="invite" className="text-xl">Invite a teammate</h2>
          <ActionForm action={inviteMember} className="flex flex-wrap items-end gap-3 rounded-card bg-surface-2 p-4">
            {(p) => (
              <>
                <div className="min-w-56 flex-1"><Field label="Their email" name="email" type="email" required autoComplete="off" /></div>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-muted">Role</span>
                  <select name="role" defaultValue="agent" className={inputAuto}>
                    <option value="agent">Agent</option>
                    <option value="assistant">Assistant</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button disabled={p} className={primaryBtn}>{p ? "Creating…" : "Create invite"}</button>
              </>
            )}
          </ActionForm>
          {team.invites.length > 0 && (
            <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
              {team.invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{i.email} <span className="text-muted capitalize">· {i.role}</span></p>
                    <p className="text-xs text-muted">Pending · expires <LocalTime ts={i.expires} opts={{ month: "short", day: "numeric" }} /> · only works for this email</p>
                  </div>
                  <button type="button" onClick={() => copy(i.id)} className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-3 px-3 text-sm hover:text-accent">
                    {copied === i.id ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}
                    <span aria-live="polite">{copied === i.id ? "Copied" : "Copy invite link"}</span>
                  </button>
                  <Armed label="Revoke" confirm="Revoke?" icon={<X aria-hidden className="size-4" />} onConfirm={() => run(() => revokeInvite(i.id))} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
