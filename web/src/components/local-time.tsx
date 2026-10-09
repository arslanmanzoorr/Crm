"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Renders an ISO timestamp in the viewer's timezone and locale; passes non-dates (mock labels) through.
 * Formats only in the browser: the server can't know the viewer's timezone, and a server-formatted string
 * would stay on screen after hydration in the wrong format.
 */
export function LocalTime({ ts, opts }: { ts: string; opts?: Intl.DateTimeFormatOptions }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const d = new Date(ts);
  if (isNaN(d.getTime())) return <>{ts}</>;
  return (
    <time dateTime={ts} className={client ? undefined : "invisible"}>
      {client ? d.toLocaleString(undefined, opts ?? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Mon, Jan 1, 12:00 AM"}
    </time>
  );
}
