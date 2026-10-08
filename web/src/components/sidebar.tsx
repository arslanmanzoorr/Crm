import { Clapperboard, Home, Inbox, LayoutGrid, Send, Settings, Users } from "lucide-react";

const nav = [
  { label: "Workspace", icon: LayoutGrid, active: true },
  { label: "Leads", icon: Users },
  { label: "Properties", icon: Home },
  { label: "Inbox", icon: Inbox },
  { label: "Video Studio", icon: Clapperboard },
  { label: "Publish", icon: Send },
];

export function Sidebar() {
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col items-center gap-3 py-6 md:flex"
    >
      <span className="mb-6 grid size-11 place-items-center rounded-full bg-accent text-lg font-semibold text-on-light">
        E
      </span>
      {nav.map(({ label, icon: Icon, active }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          title={label}
          className={`grid size-11 place-items-center rounded-full transition duration-150 ${
            active ? "bg-surface-light text-on-light" : "bg-surface-2 text-muted hover:text-accent"
          }`}
        >
          <Icon className="size-5" />
        </button>
      ))}
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        className="mt-auto grid size-11 place-items-center rounded-full bg-surface-2 text-muted hover:text-accent"
      >
        <Settings className="size-5" />
      </button>
    </nav>
  );
}
