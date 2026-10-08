"use client";

/** Renders an ISO timestamp in the viewer's timezone; passes non-dates (mock labels) through. */
export function LocalTime({ ts, opts }: { ts: string; opts?: Intl.DateTimeFormatOptions }) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return <>{ts}</>;
  return (
    <time dateTime={ts} suppressHydrationWarning>
      {d.toLocaleString(undefined, opts ?? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
    </time>
  );
}
