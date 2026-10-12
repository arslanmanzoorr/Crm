// When a lead plans to move. Labels for the form and the lead page; "soon" decides who surfaces on Today.

export const MOVE_BY = { asap: "As soon as possible", "1-3": "In 1–3 months", "3-6": "In 3–6 months", "6-12": "In 6–12 months", "12+": "In a year or more" } as const;
export type MoveBy = keyof typeof MOVE_BY;

export const isMoveBy = (v: unknown): v is MoveBy => typeof v === "string" && v in MOVE_BY;
export const movingSoon = (v: string | null | undefined) => v === "asap" || v === "1-3";
