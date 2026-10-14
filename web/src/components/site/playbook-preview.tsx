import { delayLabel, stepText, type StoreItem } from "@/lib/store";

/** A real preview of a playbook: its first steps on a small timeline, read from the template itself. */
export function PlaybookPreview({ item, steps = 3 }: { item: StoreItem; steps?: number }) {
  const shown = item.steps.slice(0, steps);
  return (
    <ol className="relative flex flex-col gap-3 pl-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-black/15">
      {shown.map((s, i) => (
        <li key={i} className="relative text-sm">
          <span aria-hidden className={`absolute top-1.5 -left-5 size-[11px] rounded-full border-2 ${i === 0 ? "border-[#ff4f1a] bg-[#ff4f1a]" : "border-black/30 bg-white"}`} />
          <span className="block text-xs text-black/55">{delayLabel(s.after_hours)}</span>
          <span className="block truncate text-black/85">{stepText(s)}</span>
        </li>
      ))}
      {item.steps.length > steps && <li className="text-xs text-black/55">+{item.steps.length - steps} more</li>}
    </ol>
  );
}
