/**
 * Business details used by every legal page, the site footer and the terms gate. One place to edit.
 * Leave a value null until it is real: pages leave the line out rather than show a guess.
 */
export const LEGAL = {
  product: "Estos",
  site: "https://estos.app",
  /** Registered legal name, e.g. "Estos LLC". */
  entity: null as string | null,
  /** State the company is organized in; governs the Terms. */
  state: null as string | null,
  /** Mailing address for notices (and the site footer). */
  address: null as string | null,
  support: "support@estos.app",
  privacy: "privacy@estos.app",
  /** Effective date shown on every policy. */
  updated: "November 8, 2026",
  /** Bump when the Terms or Privacy Policy change materially: everyone is asked to accept again. */
  termsVersion: "2026-11-08",
  /** Full refund of a first paid charge requested within this many days (only applies once paid plans exist). */
  refundDays: 14,
};

/** Who "we" are in the policies: the registered company once known, the product name until then. */
export const operator = LEGAL.entity ?? LEGAL.product;

/** Every policy page, in reading order. */
export const LEGAL_PAGES = [
  ["Terms of Service", "/legal/terms"],
  ["Privacy Policy", "/legal/privacy"],
  ["Refunds and cancellation", "/legal/refunds"],
  ["Subprocessors", "/legal/subprocessors"],
  ["Data Processing Addendum", "/legal/dpa"],
  ["Open-source notices", "/legal/open-source"],
] as const;
