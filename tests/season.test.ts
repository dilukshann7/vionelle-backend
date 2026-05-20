import assert from "node:assert/strict";
import test from "node:test";

import { calculateCycleSeason } from "../src/services/season";

test("calculates menstrual season during period days", () => {
  const result = calculateCycleSeason({
    today: "2026-05-20",
    lastPeriodStart: "2026-05-18",
    averageCycleDays: 28,
    averagePeriodDays: 5,
  });

  assert.equal(result.season, "menstrual");
  assert.equal(result.cycleDay, 3);
});

test("calculates luteal season late in the cycle", () => {
  const result = calculateCycleSeason({
    today: "2026-06-12",
    lastPeriodStart: "2026-05-18",
    averageCycleDays: 28,
    averagePeriodDays: 5,
  });

  assert.equal(result.season, "luteal");
  assert.equal(result.cycleDay, 26);
});

test("uses unknown season when cycle input is missing", () => {
  const result = calculateCycleSeason({
    today: "2026-05-20",
    lastPeriodStart: null,
    averageCycleDays: 28,
    averagePeriodDays: 5,
  });

  assert.equal(result.season, "unknown");
  assert.equal(result.confidence, "low");
});
