import assert from "node:assert/strict";
import { test } from "node:test";
import { change, summaryText, weekOverWeek } from "./summary.ts";

const A = (leads: number, reached: number, touches: number, closed: number, earned: string) => ({ leads, reached, touches, closed, closed_agent: earned });

test("weekOverWeek: last week = 14-day minus 7-day, summed across agents", () => {
  const m = weekOverWeek({ leads: 5, agents: [A(3, 2, 10, 1, "6000"), A(2, 1, 4, 0, "0")] }, { leads: 8, agents: [A(5, 4, 20, 1, "6000"), A(3, 2, 4, 0, "0")] });
  assert.deepEqual(m.map((x) => [x.now, x.before]), [[5, 3], [3, 3], [14, 10], [1, 0], [6000, 0]]);
  assert.equal(change(m[0]), "up 2 from last week");
  assert.equal(change(m[1]), "same as last week");
  assert.equal(change(m[4]), "up $6,000 from last week");
  assert.match(summaryText(m, "whole team"), /^Weekly summary, whole team:\n- New leads: 5 \(up 2/);
});

test("weekOverWeek never reports a negative last week", () => {
  assert.equal(weekOverWeek({ leads: 4, agents: [] }, { leads: 3, agents: [] })[0].before, 0);
});
