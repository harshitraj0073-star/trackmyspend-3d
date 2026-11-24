import { describe, expect, it } from "vitest";
import {
  budgetHealthOf,
  computeAnalytics,
  computeBudgetSummary,
  computeGoals,
  computeInsightsReport,
  computeOverview,
  computeUpcomingSubscriptions,
  getDueAutoLogSubscriptions,
  getWindow,
  validateGoalTransfer,
  type Budget,
  type Expense,
  type Goal,
  type Profile,
  type Subscription
} from "./calc";
import { formatMoney, validateNonNegativeAmount, validatePositiveAmount } from "./format";

// Test fixtures live ONLY inside this test file (never imported by app code).
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    startingBalance: 10000,
    monthlyIncome: 0,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    overallLimit: null,
    setupComplete: true,
    ...overrides
  };
}

describe("calc.ts — single source of truth", () => {
  it("handles empty state cleanly across every selector", () => {
    const profile = makeProfile({ startingBalance: 0, setupComplete: false });
    const today = "2026-11-10";

    const ov = computeOverview(profile, [], [], today);
    expect(ov.currentBalance).toBe(0);
    expect(ov.spentInPeriod).toBe(0);
    expect(ov.incomeInPeriod).toBe(0);
    expect(ov.avgDailySpend).toBeNull();
    expect(ov.projectedBalanceAtEnd).toBeNull();
    expect(ov.outOfMoney).toBe(true);

    const b = computeBudgetSummary(profile, [], [], today);
    expect(b.budgeted).toEqual([]);
    expect(b.unbudgetedWithSpend).toEqual([]);

    const a = computeAnalytics([], "week", today);
    expect(a.hasData).toBe(false);
    expect(a.donut).toEqual([]);
    expect(a.bars).toHaveLength(7);
    expect(a.bars.every((bar) => bar.value === 0)).toBe(true);

    expect(computeGoals([])).toEqual([]);

    const ins = computeInsightsReport(profile, [], [], [], today);
    expect(ins.biggestCategory).toBeNull();
    expect(ins.hasWeekOverWeek).toBe(false);
    expect(ins.savingTip).toBeNull();
    expect(ins.upcomingSubscriptions).toEqual([]);
  });

  it("computes balance with income, expenses, and goal transfers accurately", () => {
    const profile = makeProfile({ startingBalance: 10000, periodStart: "2026-11-01", periodEnd: "2026-11-30" });
    const expenses: Expense[] = [
      { id: "e1", amount: 250, category: "Food", date: "2026-11-10", note: "Lunch", method: "UPI", type: "expense" },
      { id: "e2", amount: 100, category: "Transport", date: "2026-11-10", note: "Metro", method: "UPI", type: "expense" },
      { id: "e3", amount: 3000, category: "Rent", date: "2026-11-10", note: "Room", method: "UPI", type: "expense" },
      { id: "i1", amount: 1500, category: "Other", date: "2026-11-10", note: "Gig", method: "UPI", type: "income" },
      // Entry before setup should not alter post-setup balance
      { id: "old", amount: 500, category: "Food", date: "2026-10-28", note: "Old", method: "Cash", type: "expense" }
    ];
    const goals: Goal[] = [
      { id: "g1", name: "Laptop", target: 20000, saved: 1000, createdAt: "2026-11-10T00:00:00Z" }
    ];

    const ov = computeOverview(profile, expenses, goals, "2026-11-10");
    // 10000 + 1500 - 3350 - 1000 = 7150
    expect(ov.currentBalance).toBe(7150);
    expect(ov.spentInPeriod).toBe(3350);
    expect(ov.incomeInPeriod).toBe(1500);
    expect(ov.netGoalTransfers).toBe(1000);
    expect(ov.daysElapsed).toBe(9);
    expect(ov.daysLeft).toBe(20);
    expect(ov.avgDailySpend).toBe(372.22);
    expect(ov.safeDailySpend).toBe(357.5);
  });

  it("hides avgDailySpend, projectedBalanceAtEnd, and runwayDays when < 3 days or < 3 expenses", () => {
    const profile = makeProfile({ periodStart: "2026-11-10", periodEnd: "2026-11-30" });
    const expenses: Expense[] = [
      { id: "e1", amount: 250, category: "Food", date: "2026-11-10", note: "A", method: "UPI", type: "expense" },
      { id: "e2", amount: 100, category: "Transport", date: "2026-11-10", note: "B", method: "UPI", type: "expense" },
      { id: "e3", amount: 3000, category: "Rent", date: "2026-11-10", note: "C", method: "UPI", type: "expense" }
    ];

    // Same day => daysElapsed = 1 (< 3)
    const day0 = computeOverview(profile, expenses, [], "2026-11-10");
    expect(day0.daysElapsed).toBe(1);
    expect(day0.avgDailySpend).toBeNull();
    expect(day0.projectedBalanceAtEnd).toBeNull();
    expect(day0.runwayDays).toBeNull();

    // 2 days elapsed (< 3)
    const day2 = computeOverview(profile, expenses, [], "2026-11-12");
    expect(day2.daysElapsed).toBe(2);
    expect(day2.avgDailySpend).toBeNull();

    // 3 days elapsed with only 2 expenses => still null
    const day3TwoExp = computeOverview(profile, expenses.slice(0, 2), [], "2026-11-13");
    expect(day3TwoExp.avgDailySpend).toBeNull();

    // 3 days elapsed with 3 expenses => available
    const day3ThreeExp = computeOverview(profile, expenses, [], "2026-11-13");
    expect(day3ThreeExp.avgDailySpend).toBe(1116.67);
    expect(day3ThreeExp.runwayDays).not.toBeNull();
  });

  it("handles month & year rollover for windows, daysBetween, and subscriptions", () => {
    const win = getWindow("week", "2027-01-03");
    expect(win.start).toBe("2026-12-28");
    expect(win.end).toBe("2027-01-03");
    expect(win.days).toBe(7);

    const monthWin = getWindow("month", "2027-01-03");
    expect(monthWin.start).toBe("2026-12-05");
    expect(monthWin.days).toBe(30);

    const semWin = getWindow("semester", "2027-01-03");
    expect(semWin.days).toBe(180);

    const subs: Subscription[] = [
      { id: "s1", name: "Cloud", amount: 99, dayOfMonth: 2, category: "Other", autoLog: true },
      { id: "s2", name: "Music", amount: 59, dayOfMonth: 31, category: "Entertainment", autoLog: false }
    ];
    const upcoming = computeUpcomingSubscriptions(subs, "2026-12-20");
    // dayOfMonth 31 is 11 days away in Dec; dayOfMonth 2 rolls over to 2027-01-02 (13 days away)
    expect(upcoming[0].nextDate).toBe("2026-12-31");
    expect(upcoming[0].daysAway).toBe(11);
    expect(upcoming[1].nextDate).toBe("2027-01-02");
    expect(upcoming[1].daysAway).toBe(13);

    const due = getDueAutoLogSubscriptions(subs, "2027-01-03");
    expect(due).toHaveLength(1);
    expect(due[0].dueDate).toBe("2027-01-02");
  });

  it("computes exact donut percentages summing to 100.00% and aligned with bars", () => {
    const today = "2026-11-24";
    const expenses: Expense[] = [
      { id: "1", amount: 250, category: "Food", date: today, note: "Food", method: "UPI", type: "expense" },
      { id: "2", amount: 100, category: "Transport", date: today, note: "Bus", method: "Cash", type: "expense" },
      { id: "3", amount: 3000, category: "Rent", date: today, note: "Rent", method: "UPI", type: "expense" }
    ];

    const analytics = computeAnalytics(expenses, "week", today);
    expect(analytics.totalSpent).toBe(3350);
    expect(analytics.bars).toHaveLength(7);
    expect(analytics.bars[6].value).toBe(3350);
    expect(analytics.bars[0].value).toBe(0);
    // Moving average must never exceed max bar value
    expect(Math.max(...analytics.movingAverage)).toBeLessThanOrEqual(3350);

    expect(analytics.donut.map((d) => [d.category, d.pct])).toEqual([
      ["Rent", 89.55],
      ["Food", 7.46],
      ["Transport", 2.99]
    ]);
    const pctSum = Math.round(analytics.donut.reduce((s, d) => s + d.pct, 0) * 100) / 100;
    expect(pctSum).toBe(100);
  });

  it("applies exact budget thresholds (<80% green, 80-100% amber, >100% red)", () => {
    expect(budgetHealthOf(0.5)).toBe("ok");
    expect(budgetHealthOf(0.799)).toBe("ok");
    expect(budgetHealthOf(0.8)).toBe("warn");
    expect(budgetHealthOf(1.0)).toBe("warn");
    expect(budgetHealthOf(1.01)).toBe("over");

    const profile = makeProfile({ periodStart: "2026-11-01" });
    const budgets: Budget[] = [{ category: "Food", monthlyLimit: 500 }];
    const expenses: Expense[] = [
      { id: "1", amount: 250, category: "Food", date: "2026-11-10", note: "A", method: "UPI", type: "expense" },
      { id: "2", amount: 300, category: "Food", date: "2026-11-11", note: "B", method: "UPI", type: "expense" },
      { id: "3", amount: 100, category: "Transport", date: "2026-11-11", note: "C", method: "UPI", type: "expense" }
    ];

    const summary = computeBudgetSummary(profile, expenses, budgets, "2026-11-11");
    expect(summary.budgeted).toHaveLength(1);
    expect(summary.budgeted[0]).toMatchObject({
      category: "Food",
      spent: 550,
      limit: 500,
      pct: 110,
      health: "over"
    });
    expect(summary.unbudgetedWithSpend).toEqual([{ category: "Transport", spent: 100 }]);
  });

  it("enforces goal transfer limits and never suggests cutting fixed categories", () => {
    expect(validateGoalTransfer(1000, 500, 0).ok).toBe(false);
    expect(validateGoalTransfer(500, 500, 0).ok).toBe(true);
    expect(validateGoalTransfer(-600, 1000, 500).ok).toBe(false);
    expect(validateGoalTransfer(-500, 1000, 500).ok).toBe(true);

    // Only fixed category (Rent) spent => savingTip MUST be null
    const profile = makeProfile({ periodStart: "2026-11-01" });
    const rentOnly: Expense[] = [
      { id: "r1", amount: 3000, category: "Rent", date: "2026-11-02", note: "Rent", method: "UPI", type: "expense" }
    ];
    const insRent = computeInsightsReport(profile, rentOnly, [], [], "2026-11-05");
    expect(insRent.biggestCategory?.category).toBe("Rent");
    expect(insRent.savingTip).toBeNull();

    // Add flexible category (Food) => savingTip targets Food, never Rent
    const withFood: Expense[] = [
      ...rentOnly,
      { id: "f1", amount: 1000, category: "Food", date: "2026-11-03", note: "Food", method: "UPI", type: "expense" }
    ];
    const insFood = computeInsightsReport(profile, withFood, [], [], "2026-11-05");
    expect(insFood.savingTip).toContain("Food");
    expect(insFood.savingTip).not.toContain("Rent");
    expect(insFood.savingTip).toContain("₹100");
  });

  it("formats Indian currency and validates amounts strictly", () => {
    expect(formatMoney(100000)).toBe("₹1,00,000");
    expect(formatMoney(1234.5)).toBe("₹1,234.50");
    expect(formatMoney(-500)).toBe("−₹500");

    expect(validatePositiveAmount("250").ok).toBe(true);
    expect(validatePositiveAmount("250.75").ok).toBe(true);
    expect(validatePositiveAmount("250.755").ok).toBe(false);
    expect(validatePositiveAmount("0").ok).toBe(false);
    expect(validatePositiveAmount("-10").ok).toBe(false);
    expect(validatePositiveAmount("abc").ok).toBe(false);
    expect(validatePositiveAmount("100000001").ok).toBe(false);
    expect(validateNonNegativeAmount("0").ok).toBe(true);
  });
});
