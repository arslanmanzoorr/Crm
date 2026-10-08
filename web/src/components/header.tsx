import { Bell, Search } from "lucide-react";
import { agent, kpis, schedule } from "@/lib/data";
import { Avatar, AvatarStack, IconButton } from "./ui";

const DAY_START = 8 * 60; // 8:00
const DAY_END = 20 * 60; // 20:00
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const pct = (min: number) => ((min - DAY_START) / (DAY_END - DAY_START)) * 100;

/** Lime timeline pill with today's showings/calls and a "now" marker. */
export function ScheduleTimeline({ now = "14:15" }: { now?: string }) {
  return (
    <section aria-label="Your schedule" className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-surface-1 p-1.5 pr-4">
      <span className="hidden shrink-0 rounded-full bg-surface-light px-4 py-2.5 text-sm font-medium text-on-light sm:block">
        Your schedule
      </span>
      <div className="relative h-11 min-w-0 flex-1 rounded-full bg-accent/90">
        {schedule.map((s) => (
          <span
            key={s.id}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${Math.min(94, Math.max(6, pct(toMin(s.time))))}%` }}
            title={`${s.time} · ${s.label} · ${s.minutes} min`}
          >
            <AvatarStack names={s.people} size={30} />
          </span>
        ))}
        <span
          className="absolute -top-1 bottom-[-4px] w-0.5 bg-on-light"
          style={{ left: `${pct(toMin(now))}%` }}
          aria-label={`Now ${now}`}
        >
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-on-light px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-accent">
            {now}
          </span>
        </span>
      </div>
    </section>
  );
}

export function Header() {
  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <ScheduleTimeline />
        <IconButton label="Search" className="hidden sm:grid">
          <Search className="size-5" />
        </IconButton>
        <IconButton label="Notifications">
          <Bell className="size-5" />
        </IconButton>
        <Avatar name={agent.name} size={44} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm text-muted">Good afternoon, {agent.name.split(" ")[0]}</p>
          <h1 className="text-4xl font-light tracking-[0.2em] uppercase sm:text-5xl">
            W<span className="text-accent">o</span>rkspace
          </h1>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {kpis.map((k) => (
            <div key={k.label} className="flex items-baseline gap-2">
              <dd className={`text-5xl font-light tabular-nums ${k.label === "Hot leads" ? "text-accent" : ""}`}>
                {k.value}
              </dd>
              <dt className="max-w-[5rem] text-xs leading-tight text-muted">{k.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
