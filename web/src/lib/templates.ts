// The team's own document templates, no I/O. A template is plain text with {{fields}}; filling it from a deal
// never invents anything: an unknown or empty field is left visible as [field] so the agent sees the gap.

export const FIELDS = {
  client_name: "Client's full name",
  property_address: "Property address",
  price: "Contract price",
  earnest: "Earnest money",
  accepted_date: "Offer accepted date",
  closing_date: "Closing date",
  side: "Buyer or seller",
  agent_name: "Agent's name",
  agent_email: "Agent's email",
  team_name: "Team name",
  today: "Today's date",
} as const;
export type Field = keyof typeof FIELDS;
export type FieldValues = Partial<Record<Field, string>>;

const TOKEN = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Fields a template uses that we don't know (typos), so the editor can warn before saving. */
export function unknownFields(body: string): string[] {
  return [...new Set([...body.matchAll(TOKEN)].map((m) => m[1]).filter((f) => !(f in FIELDS)))];
}

/** Fill a template. Missing values stay visible as [Label] rather than silently disappearing. */
export function fill(body: string, values: FieldValues): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const text = body.replace(TOKEN, (_, f: string) => {
    const v = (values as Record<string, string | undefined>)[f]?.trim();
    if (v) return v;
    const label = FIELDS[f as Field] ?? f;
    missing.add(label);
    return `[${label}]`;
  });
  return { text, missing: [...missing] };
}
