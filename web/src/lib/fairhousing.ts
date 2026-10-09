// Fair Housing language check for listing copy, no I/O. Based on HUD advertising guidance and common MLS rules:
// describe the property, not who should live there. It flags phrases for a human to review; it doesn't decide.

export type Flag = { phrase: string; index: number; level: "high" | "review" | "style"; why: string; suggest: string };

type Rule = { re: RegExp; level: Flag["level"]; why: string; suggest: string };

const R = (re: RegExp, level: Flag["level"], why: string, suggest: string): Rule => ({ re, level, why, suggest });

const RULES: Rule[] = [
  // Familial status
  R(/\b(no|without) (kids|children|babies)\b/gi, "high", "Excludes families with children (familial status).", "Remove it. Describe the home instead."),
  R(/\badults? only\b/gi, "high", "Excludes families with children, unless it's a qualified 55+ community.", "If it's a qualified 55+ community, say so exactly; otherwise remove."),
  R(/\b(perfect|ideal|great) for (a )?(young )?(couples?|singles?|families|empty[- ]nesters|retirees|newlyweds|students)\b/gi, "high", "Says who should live there (familial status).", "Describe features: \"three bedrooms near the park\"."),
  R(/\b(family|kid)[- ]friendly (neighborhood|community|street)\b/gi, "review", "Implies a preference about household type.", "Name the features: parks, playgrounds, schools by name."),
  R(/\bempty[- ]nesters?\b/gi, "review", "Targets a household type.", "Describe size and layout instead."),
  // Religion
  R(/\b(christian|catholic|jewish|muslim|hindu|mormon|protestant)\s+(neighborhood|community|area|home|family|families)\b/gi, "high", "Describes residents by religion.", "Remove. You can name a nearby landmark by its name."),
  // Race, color, national origin
  R(/\b(white|black|hispanic|latino|asian|ethnic|integrated|segregated)\s+(neighborhood|community|area|families|residents)\b/gi, "high", "Describes residents by race, color or national origin.", "Remove; describe the property and location facts."),
  R(/\bexclusive (neighborhood|community|area|enclave)\b/gi, "review", "\"Exclusive\" about a community can read as excluding people.", "Use specifics: \"gated\", \"private road\", \"one of 12 homes\"."),
  R(/\b(english[- ]speaking|no immigrants|americans only)\b/gi, "high", "National origin preference.", "Remove."),
  R(/\brestricted (neighborhood|community|area)\b/gi, "high", "Historically used for racial covenants.", "Describe actual deed or HOA rules, if relevant."),
  // Sex
  R(/\b(males?|females?|men|women|ladies|gentlemen) only\b/gi, "high", "Preference by sex.", "Remove."),
  R(/\bbachelor pad\b/gi, "review", "Targets a sex and household type.", "Describe the space: \"open-plan loft\"."),
  // Disability
  R(/\b(no wheelchairs|able[- ]bodied|not (suitable|for) (the )?handicapped|must (be able to )?(climb|walk))\b/gi, "high", "Excludes people with disabilities.", "Describe the feature: \"two flights of stairs to the entry\"."),
  R(/\bhandicap(ped)?\b/gi, "style", "Outdated term.", "Use \"accessible\" (e.g. \"accessible entrance\")."),
  // Source of income (illegal to refuse in many states and cities)
  R(/\bno (section[- ]?8|vouchers?|housing (choice )?vouchers?|government assistance)\b/gi, "high", "Refusing vouchers is illegal in many states and cities (source of income).", "Remove."),
  // Style the MLS often asks for
  R(/\bmaster (bed(room)?|suite|bath)\b/gi, "style", "Many MLSs now prefer neutral terms.", "\"Primary bedroom\" / \"primary suite\"."),
];

export function checkFairHousing(text: string): Flag[] {
  const flags: Flag[] = [];
  for (const r of RULES) {
    for (const m of text.matchAll(r.re)) flags.push({ phrase: m[0], index: m.index ?? 0, level: r.level, why: r.why, suggest: r.suggest });
  }
  const rank = { high: 0, review: 1, style: 2 };
  return flags.sort((a, b) => rank[a.level] - rank[b.level] || a.index - b.index);
}
