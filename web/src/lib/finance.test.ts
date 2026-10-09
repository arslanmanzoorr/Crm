import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeRental, maxPrice, monthlyCost, payment } from "./finance.ts";

const near = (a: number, b: number, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test("payment matches the standard amortization formula", () => {
  near(payment(400_000, 6.5, 30), 2528.27);   // textbook value
  near(payment(120_000, 0, 10), 1000);         // zero rate
  assert.equal(payment(0, 7, 30), 0);
});

test("monthlyCost adds tax, insurance, HOA and PMI only under 20% down", () => {
  const base = { price: 500_000, ratePct: 6.5, years: 30, taxPct: 1.2, insurance: 1800, hoa: 100, pmiPct: 0.5 };
  const low = monthlyCost({ ...base, downPct: 10 });
  near(low.loan, 450_000);
  near(low.tax, 500);
  near(low.ins, 150);
  near(low.pmi, 187.5);
  near(low.total, low.pi + 500 + 150 + 187.5 + 100);
  assert.equal(monthlyCost({ ...base, downPct: 20 }).pmi, 0);
});

test("maxPrice respects both the 28% and 36% limits", () => {
  const terms = { downPct: 20, ratePct: 6.5, years: 30, taxPct: 1.2, insurance: 1500, hoa: 0, pmiPct: 0.5, frontPct: 28, backPct: 36 };
  const r = maxPrice({ monthlyIncome: 10_000, monthlyDebts: 500, ...terms });
  assert.equal(r.budget, 2800);                 // 28% binds (36% - debts = 3100)
  assert.ok(monthlyCost({ ...terms, price: r.price }).total <= 2800);
  assert.ok(monthlyCost({ ...terms, price: r.price + 2000 }).total > 2800);
  const heavyDebt = maxPrice({ monthlyIncome: 10_000, monthlyDebts: 1500, ...terms });
  assert.equal(heavyDebt.budget, 2100);         // 36% binds
  assert.deepEqual(maxPrice({ monthlyIncome: 3000, monthlyDebts: 2000, ...terms }), { price: 0, budget: 0 });
});

test("analyzeRental: NOI, cap rate, cash flow, cash-on-cash, DSCR", () => {
  const r = analyzeRental({
    price: 300_000, rehab: 20_000, closingPct: 3, downPct: 25, ratePct: 7, years: 30,
    rent: 2800, otherIncome: 0, vacancyPct: 5, taxPct: 1, insurance: 1200, hoa: 0, mgmtPct: 8, maintenancePct: 8, otherExpenses: 0,
  });
  near(r.gross, 33_600);
  near(r.collected, 31_920);
  near(r.opex, 3000 + 1200 + 31_920 * 0.16);   // 9307.20
  near(r.noi, 31_920 - 9307.2);
  near(r.capRate, (r.noi / 320_000) * 100);
  near(r.cashIn, 75_000 + 9000 + 20_000);
  near(r.debt, payment(225_000, 7, 30) * 12);
  near(r.cashOnCash, (r.cashFlow / 104_000) * 100);
  near(r.dscr!, r.noi / r.debt);
  assert.equal(r.onePercent, false);           // 2800 < 3000
});
