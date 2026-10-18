// Shared form classes. Plain module (no "use client"): importing these from a Client Component module into a
// Server Component would hand the server a client reference instead of the string.
const field = "min-h-11 rounded-2xl bg-surface-1 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent";
/** Full-width field (stacked forms). */
export const input = `${field} w-full`;
/** Content-width field for inline rows; sizing classes can be added because nothing here fights them. */
export const inputAuto = field;
export const primaryBtn = "min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-on-light hover:bg-accent-strong disabled:opacity-60";
