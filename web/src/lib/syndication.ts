// Where a listing shows up beyond social media, and how it gets there. No I/O.
// The big US portals don't take uploads from a CRM: for-sale listings reach them from the MLS (through the
// MLS's syndication, usually ListHub, or Zillow's MLS feed). What the agent controls: get it on the MLS,
// opt the brokerage into syndication, then confirm it's live on each portal.

export const PORTALS = [
  { name: "Zillow", domain: "zillow.com", note: "Also shows on Trulia. From your MLS feed." },
  { name: "Realtor.com", domain: "realtor.com", note: "From your MLS through ListHub." },
  { name: "Redfin", domain: "redfin.com", note: "From your MLS feed." },
  { name: "Homes.com", domain: "homes.com", note: "From your MLS through ListHub. Leads go to the listing agent." },
] as const;

/** A web search limited to one portal, so the agent can confirm the listing is live there. */
export const checkUrl = (domain: string, address: string, area: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} "${address}"${area ? ` ${area}` : ""}`)}`;

/** What's left before portals can show the listing. Empty list = nothing blocking on our side. */
export function syndicationSteps(p: { mlsId?: string | null; approved?: boolean; status: string }) {
  const steps: string[] = [];
  if (p.approved === false) steps.push("Broker approval in EstateOS");
  if (!p.mlsId) steps.push("Enter it on your MLS, then add the MLS number here (Edit)");
  if (p.status === "Coming soon") steps.push("Coming soon: portals only show it if your MLS and brokerage allow pre-market syndication");
  return steps;
}
