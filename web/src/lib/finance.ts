// Mortgage and investment math, no I/O. Estimates for conversation, never a credit decision:
// every assumption is a parameter the agent can see and change.

/** Monthly principal and interest on a fixed-rate loan. */
export function payment(loan: number, ratePct: number, years: number) {
  const n = years * 12;
  if (loan <= 0 || n <= 0) return 0;
  const r = ratePct / 100 / 12;
  return r === 0 ? loan / n : (loan * r) / (1 - (1 + r) ** -n);
}

export type Housing = {
  price: number; downPct: number; ratePct: number; years: number;
  taxPct: number;          // property tax, % of price per year
  insurance: number;       // homeowners insurance per year
  hoa: number;             // per month
  pmiPct: number;          // per year, % of the loan, charged while down payment is under 20%
};

export function monthlyCost(h: Housing) {
  const loan = h.price * (1 - h.downPct / 100);
  const pi = payment(loan, h.ratePct, h.years);
  const tax = (h.price * h.taxPct) / 100 / 12;
  const ins = h.insurance / 12;
  const pmi = h.downPct < 20 ? (loan * h.pmiPct) / 100 / 12 : 0;
  return { loan, pi, tax, ins, pmi, hoa: h.hoa, total: pi + tax + ins + pmi + h.hoa };
}

/**
 * Highest price where total housing cost stays within `frontPct` of gross monthly income and housing plus
 * other debts stay within `backPct` (the common 28/36 guideline). Solved by bisection on price.
 */
export function maxPrice(a: { monthlyIncome: number; monthlyDebts: number; frontPct: number; backPct: number } & Omit<Housing, "price">) {
  const budget = Math.min((a.monthlyIncome * a.frontPct) / 100, (a.monthlyIncome * a.backPct) / 100 - a.monthlyDebts);
  if (budget <= 0) return { price: 0, budget: Math.max(budget, 0) };
  let lo = 0, hi = 100_000_000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (monthlyCost({ ...a, price: mid }).total <= budget) lo = mid; else hi = mid;
  }
  return { price: Math.floor(lo / 1000) * 1000, budget };
}

export type Rental = {
  price: number; rehab: number; closingPct: number; downPct: number; ratePct: number; years: number;
  rent: number;            // per month, all units
  otherIncome: number;     // per month (parking, laundry)
  vacancyPct: number;      // of gross income
  taxPct: number; insurance: number; hoa: number;
  mgmtPct: number;         // of collected income
  maintenancePct: number;  // of collected income (repairs + capital reserves)
  otherExpenses: number;   // per month
};

export function analyzeRental(x: Rental) {
  const gross = (x.rent + x.otherIncome) * 12;
  const collected = gross * (1 - x.vacancyPct / 100);
  const opex = (x.price * x.taxPct) / 100 + x.insurance + x.hoa * 12 + collected * (x.mgmtPct + x.maintenancePct) / 100 + x.otherExpenses * 12;
  const noi = collected - opex;
  const loan = x.price * (1 - x.downPct / 100);
  const debt = payment(loan, x.ratePct, x.years) * 12;
  const cashIn = x.price - loan + (x.price * x.closingPct) / 100 + x.rehab;
  const cashFlow = noi - debt;
  return {
    gross, collected, opex, noi, loan, debt, cashIn, cashFlow,
    capRate: x.price + x.rehab > 0 ? (noi / (x.price + x.rehab)) * 100 : 0,
    cashOnCash: cashIn > 0 ? (cashFlow / cashIn) * 100 : 0,
    dscr: debt > 0 ? noi / debt : null,
    grm: x.rent > 0 ? x.price / (x.rent * 12) : null,
    onePercent: x.price > 0 && x.rent >= x.price * 0.01,
  };
}
