import {
  CATEGORIES,
  FLEXIBLE_CATEGORIES,
  OVER_RATIO,
  WARN_RATIO,
  type Category,
  type PaymentMethod
} from "./constants";
import { daysBetween, formatMoney, fromISODate, round2, shiftDaysISO, toISODate } from "./format";

export type TxType = "expense" | "income";
export type Health = "ok" | "warn" | "over";
export type Range = "week" | "month" | "semester";

export interface Profile {
  startingBalance: number;
  monthlyIncome: number;
  /** ISO YYYY-MM-DD when the user saved "Money I have now". */
  periodStart: string;
  /** ISO YYYY-MM-DD chosen end date (default = end of current month). */
  periodEnd: string;
  /** Optional overall spending limit for the period. */
  overallLimit: number | null;
  setupComplete: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  /** ISO date YYYY-MM-DD */
  date: string;
  note: string;
  method: PaymentMethod;
  type: TxType;
}

export interface Budget {
  category: Category;
  monthlyLimit: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  category: Category;
  autoLog: boolean;
  lastLoggedMonth?: string;
}

export interface DateWindow {
  range: Range;
  start: string;
  end: string;
  days: number;
}

export interface OverviewMetrics {
  periodStart: string;
  periodEnd: string;
  startingBalance: number;
  incomeInPeriod: number;
  spentInPeriod: number;
  netGoalTransfers: number;
  currentBalance: number;
  daysElapsed: number;
  daysLeft: number;
  expenseCountInPeriod: number;
  avgDailySpend: number | null;
  safeDailySpend: number;
  projectedBalanceAtEnd: number | null;
  runwayDays: number | null;
  outOfMoney: boolean;
  availableMoney: number;
  spentRatio: number;
  orbHealth: Health;
}

export interface BudgetUsageItem {
  category: Category;
  spent: number;
  limit: number;
  ratio: number;
  pct: number;
  health: Health;
}

export interface UnbudgetedCategoryItem {
  category: Category;
  spent: number;
}

export interface BudgetSummary {
  budgeted: BudgetUsageItem[];
  unbudgetedWithSpend: UnbudgetedCategoryItem[];
  unbudgetedCategories: Category[];
}

export interface SeriesBar {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  value: number;
}

export interface DonutSlice {
  category: Category;
  value: number;
  /** Exact percentage (0..100) rounded to 2 decimals; all slices sum to exactly 100.00%. */
  pct: number;
  share: number;
}

export interface AnalyticsData {
  window: DateWindow;
  bars: SeriesBar[];
  movingAverage: number[];
  donut: DonutSlice[];
  totalSpent: number;
  hasData: boolean;
}

export interface GoalProgress extends Goal {
  ratio: number;
  pct: number;
  done: boolean;
}

export interface UpcomingSubscription extends Subscription {
  nextDate: string;
  daysAway: number;
}

export interface InsightsReport {
  biggestCategory: { category: Category; amount: number; pct: number } | null;
  weekOverWeekPct: number | null;
  hasWeekOverWeek: boolean;
  avgDailySpend: number | null;
  projectedBalanceAtEnd: number | null;
  runwayDays: number | null;
  outOfMoney: boolean;
  savingTip: string | null;
  upcomingSubscriptions: UpcomingSubscription[];
}

const weekdayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const dayMonthFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const dayOnlyFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric" });

/** Single source of truth for all chart & analytics windows ending at todayIso. */
export function getWindow(range: Range, todayIso: string): DateWindow {
  const days = range === "week" ? 7 : range === "month" ? 30 : 180;
  const start = shiftDaysISO(todayIso, -(days - 1));
  return { range, start, end: todayIso, days };
}

/** Budget ring threshold: <80% ok (green), 80–100% warn (amber), >100% over (red). */
export function budgetHealthOf(ratio: number): Health {
  if (ratio > OVER_RATIO) return "over";
  if (ratio >= WARN_RATIO) return "warn";
  return "ok";
}

/**
 * Computes all Overview & period KPIs from user input alone.
 * - currentBalance = startingBalance + sum(income after setup) - sum(expenses after setup) - sum(goal saved)
 * - avgDailySpend = spentInPeriod / daysElapsed (only when daysElapsed >= 3 and >= 3 expense entries)
 * - safeDailySpend = currentBalance / max(daysLeft, 1)
 */
export function computeOverview(
  profile: Profile,
  expenses: Expense[],
  goals: Goal[],
  todayIso: string
): OverviewMetrics {
  const periodStart = profile.periodStart;
  const periodEnd = profile.periodEnd;

  let incomeInPeriod = 0;
  let spentInPeriod = 0;
  let expenseCountInPeriod = 0;

  for (const e of expenses) {
    if (e.date < periodStart || e.date > todayIso) continue;
    if (e.type === "income") {
      incomeInPeriod += e.amount;
    } else {
      spentInPeriod += e.amount;
      expenseCountInPeriod += 1;
    }
  }

  incomeInPeriod = round2(incomeInPeriod);
  spentInPeriod = round2(spentInPeriod);
  const netGoalTransfers = round2(goals.reduce((acc, g) => acc + g.saved, 0));
  const currentBalance = round2(
    profile.startingBalance + incomeInPeriod - spentInPeriod - netGoalTransfers
  );

  const daysElapsed = Math.max(1, daysBetween(periodStart, todayIso));
  const daysLeft = Math.max(0, daysBetween(todayIso, periodEnd));

  const hasAvg = daysElapsed >= 3 && expenseCountInPeriod >= 3;
  const avgDailySpend = hasAvg ? round2(spentInPeriod / daysElapsed) : null;
  const safeDailySpend = round2(currentBalance / Math.max(daysLeft, 1));
  const projectedBalanceAtEnd =
    avgDailySpend !== null ? round2(currentBalance - avgDailySpend * daysLeft) : null;

  const outOfMoney = currentBalance <= 0;
  const runwayDays = outOfMoney
    ? 0
    : avgDailySpend !== null && avgDailySpend > 0
      ? round2(currentBalance / avgDailySpend)
      : null;

  const availableMoney = round2(profile.startingBalance + incomeInPeriod);
  const spentRatio =
    availableMoney > 0 ? spentInPeriod / availableMoney : spentInPeriod > 0 ? 1.1 : 0;

  const overOverallLimit =
    profile.overallLimit !== null && profile.overallLimit > 0 && spentInPeriod > profile.overallLimit;

  let orbHealth: Health = "ok";
  if (outOfMoney || overOverallLimit || spentRatio > 1) {
    orbHealth = "over";
  } else if (spentRatio > 0.7) {
    orbHealth = "warn";
  }

  return {
    periodStart,
    periodEnd,
    startingBalance: profile.startingBalance,
    incomeInPeriod,
    spentInPeriod,
    netGoalTransfers,
    currentBalance,
    daysElapsed,
    daysLeft,
    expenseCountInPeriod,
    avgDailySpend,
    safeDailySpend,
    projectedBalanceAtEnd,
    runwayDays,
    outOfMoney,
    availableMoney,
    spentRatio,
    orbHealth
  };
}

/** Category expense totals in [startIso, endIso]. */
export function computeCategoryTotals(
  expenses: Expense[],
  startIso: string,
  endIso: string
): Record<Category, number> {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const e of expenses) {
    if (e.type !== "expense") continue;
    if (e.date < startIso || e.date > endIso) continue;
    totals[e.category] = round2(totals[e.category] + e.amount);
  }
  return totals;
}

/**
 * Budget usage within [profile.periodStart, todayIso].
 * Only categories explicitly budgeted by the user get rings.
 */
export function computeBudgetSummary(
  profile: Profile,
  expenses: Expense[],
  budgets: Budget[],
  todayIso: string
): BudgetSummary {
  const spentByCat = computeCategoryTotals(expenses, profile.periodStart, todayIso);
  const budgetMap = new Map(budgets.map((b) => [b.category, b.monthlyLimit]));

  const budgeted: BudgetUsageItem[] = [];
  const unbudgetedWithSpend: UnbudgetedCategoryItem[] = [];
  const unbudgetedCategories: Category[] = [];

  for (const category of CATEGORIES) {
    const spent = spentByCat[category];
    const limit = budgetMap.get(category);
    if (limit !== undefined && limit > 0) {
      const ratio = spent / limit;
      budgeted.push({
        category,
        spent,
        limit,
        ratio,
        pct: round2(ratio * 100),
        health: budgetHealthOf(ratio)
      });
    } else {
      unbudgetedCategories.push(category);
      if (spent > 0) {
        unbudgetedWithSpend.push({ category, spent });
      }
    }
  }

  return { budgeted, unbudgetedWithSpend, unbudgetedCategories };
}

/** Largest Remainder Method so donut percentages always sum to exactly 100.00%. */
export function computeExactDonut(totals: Record<Category, number>): DonutSlice[] {
  const entries = CATEGORIES.map((category) => ({ category, value: round2(totals[category]) }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = round2(entries.reduce((acc, e) => acc + e.value, 0));
  if (total <= 0 || entries.length === 0) return [];

  // Allocate 10,000 basis points (= 100.00%) using largest remainder
  const rawBasis = entries.map((e) => {
    const exact = (e.value / total) * 10_000;
    const floored = Math.floor(exact);
    return { ...e, floored, remainder: exact - floored };
  });

  let remaining = 10_000 - rawBasis.reduce((acc, r) => acc + r.floored, 0);
  const byRemainder = [...rawBasis].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining; i++) {
    byRemainder[i % byRemainder.length].floored += 1;
  }

  return rawBasis.map((r) => {
    const pct = round2(r.floored / 100);
    return {
      category: r.category,
      value: r.value,
      pct,
      share: r.floored / 10_000
    };
  });
}

/**
 * Computes bars, 7-point moving average of those exact bars, and category donut
 * all from the SAME getWindow(range, todayIso).
 */
export function computeAnalytics(
  expenses: Expense[],
  range: Range,
  todayIso: string
): AnalyticsData {
  const win = getWindow(range, todayIso);
  const byDay = new Map<string, number>();

  for (const e of expenses) {
    if (e.type !== "expense") continue;
    if (e.date < win.start || e.date > win.end) continue;
    byDay.set(e.date, round2((byDay.get(e.date) ?? 0) + e.amount));
  }

  const bars: SeriesBar[] = [];
  if (range === "semester") {
    // 26 buckets covering the 180-day window ending at todayIso
    const bucketCount = 26;
    const step = 7;
    const firstStart = shiftDaysISO(todayIso, -(bucketCount * step - 1));
    for (let b = 0; b < bucketCount; b++) {
      const bStart = shiftDaysISO(firstStart, b * step);
      const bEnd = shiftDaysISO(bStart, step - 1);
      const clampedStart = bStart < win.start ? win.start : bStart;
      const clampedEnd = bEnd > win.end ? win.end : bEnd;
      let sum = 0;
      const span = daysBetween(clampedStart, clampedEnd);
      for (let d = 0; d <= span; d++) {
        sum += byDay.get(shiftDaysISO(clampedStart, d)) ?? 0;
      }
      bars.push({
        key: clampedStart,
        label: dayMonthFmt.format(fromISODate(clampedStart)),
        startDate: clampedStart,
        endDate: clampedEnd,
        value: round2(sum)
      });
    }
  } else {
    for (let i = 0; i < win.days; i++) {
      const iso = shiftDaysISO(win.start, i);
      const d = fromISODate(iso);
      bars.push({
        key: iso,
        label: range === "week" ? weekdayFmt.format(d) : dayOnlyFmt.format(d),
        startDate: iso,
        endDate: iso,
        value: byDay.get(iso) ?? 0
      });
    }
  }

  // 7-point trailing moving average of the exact same bars
  const movingAverage = bars.map((_, idx) => {
    const startIdx = Math.max(0, idx - 6);
    let sum = 0;
    for (let j = startIdx; j <= idx; j++) sum += bars[j].value;
    return round2(sum / (idx - startIdx + 1));
  });

  const catTotals = computeCategoryTotals(expenses, win.start, win.end);
  const donut = computeExactDonut(catTotals);
  const totalSpent = round2(bars.reduce((acc, b) => acc + b.value, 0));

  return {
    window: win,
    bars,
    movingAverage,
    donut,
    totalSpent,
    hasData: totalSpent > 0
  };
}

export function computeGoals(goals: Goal[]): GoalProgress[] {
  return goals.map((g) => {
    const ratio = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
    return { ...g, ratio, pct: round2(ratio * 100), done: g.target > 0 && g.saved >= g.target };
  });
}

/** Validates goal deposit/withdrawal against currentBalance and goal.saved. */
export function validateGoalTransfer(
  delta: number,
  currentBalance: number,
  goalSaved: number
): { ok: boolean; error: string | null } {
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "Enter an amount greater than 0." };
  }
  if (delta > 0 && delta > currentBalance) {
    return {
      ok: false,
      error: `Cannot add more than your Current Balance (${formatMoney(currentBalance)}).`
    };
  }
  if (delta < 0 && Math.abs(delta) > goalSaved) {
    return {
      ok: false,
      error: `Cannot withdraw more than saved (${formatMoney(goalSaved)}).`
    };
  }
  return { ok: true, error: null };
}

/** Computes upcoming subscription dates from real local date (handles short months & year rollover). */
export function computeUpcomingSubscriptions(
  subscriptions: Subscription[],
  todayIso: string
): UpcomingSubscription[] {
  const today = fromISODate(todayIso);
  const y = today.getFullYear();
  const m = today.getMonth();

  return subscriptions
    .map((sub) => {
      const clampedDayThisMonth = Math.min(sub.dayOfMonth, new Date(y, m + 1, 0).getDate());
      let due = new Date(y, m, clampedDayThisMonth);
      if (toISODate(due) < todayIso) {
        const nextMonthMaxDay = new Date(y, m + 2, 0).getDate();
        due = new Date(y, m + 1, Math.min(sub.dayOfMonth, nextMonthMaxDay));
      }
      const nextDate = toISODate(due);
      const daysAway = Math.max(0, daysBetween(todayIso, nextDate));
      return { ...sub, nextDate, daysAway };
    })
    .sort((a, b) => a.daysAway - b.daysAway);
}

/** Returns auto-log subscriptions that are due on or before today in the current month and not yet logged. */
export function getDueAutoLogSubscriptions(
  subscriptions: Subscription[],
  todayIso: string
): Array<{ sub: Subscription; dueDate: string; monthKey: string }> {
  const today = fromISODate(todayIso);
  const y = today.getFullYear();
  const m = today.getMonth();
  const monthKey = todayIso.slice(0, 7);
  const maxDayThisMonth = new Date(y, m + 1, 0).getDate();

  const due: Array<{ sub: Subscription; dueDate: string; monthKey: string }> = [];
  for (const sub of subscriptions) {
    if (!sub.autoLog) continue;
    if (sub.lastLoggedMonth === monthKey) continue;
    const dueDay = Math.min(sub.dayOfMonth, maxDayThisMonth);
    if (today.getDate() >= dueDay) {
      due.push({
        sub,
        dueDate: toISODate(new Date(y, m, dueDay)),
        monthKey
      });
    }
  }
  return due;
}

/** Rule-based Insights derived strictly from real user entries. */
export function computeInsightsReport(
  profile: Profile,
  expenses: Expense[],
  goals: Goal[],
  subscriptions: Subscription[],
  todayIso: string
): InsightsReport {
  const overview = computeOverview(profile, expenses, goals, todayIso);
  const periodTotals = computeCategoryTotals(expenses, profile.periodStart, todayIso);

  let biggestCat: Category | null = null;
  let biggestAmt = 0;
  for (const cat of CATEGORIES) {
    if (periodTotals[cat] > biggestAmt) {
      biggestAmt = periodTotals[cat];
      biggestCat = cat;
    }
  }

  const biggestCategory =
    biggestCat && biggestAmt > 0 && overview.spentInPeriod > 0
      ? {
          category: biggestCat,
          amount: biggestAmt,
          pct: Math.round((biggestAmt / overview.spentInPeriod) * 100)
        }
      : null;

  // Week-over-week requires 14+ days of real data
  const thisWin = getWindow("week", todayIso);
  const prevEnd = shiftDaysISO(thisWin.start, -1);
  const prevStart = shiftDaysISO(prevEnd, -6);
  const earliestExpense = expenses
    .filter((e) => e.type === "expense" && e.date <= todayIso)
    .reduce<string | null>((min, e) => (min === null || e.date < min ? e.date : min), null);

  const spanDays =
    earliestExpense !== null ? daysBetween(earliestExpense, todayIso) + 1 : 0;
  const has14Days = overview.daysElapsed >= 14 || spanDays >= 14;

  let thisWeek = 0;
  let prevWeek = 0;
  for (const e of expenses) {
    if (e.type !== "expense") continue;
    if (e.date >= thisWin.start && e.date <= thisWin.end) thisWeek += e.amount;
    if (e.date >= prevStart && e.date <= prevEnd) prevWeek += e.amount;
  }

  const hasWeekOverWeek = has14Days && prevWeek > 0;
  const weekOverWeekPct = hasWeekOverWeek
    ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100)
    : null;

  // Saving suggestion: ONLY flexible categories (Food, Entertainment, Shopping, Transport, Other)
  let topFlexCat: Category | null = null;
  let topFlexAmt = 0;
  for (const cat of FLEXIBLE_CATEGORIES) {
    if (periodTotals[cat] > topFlexAmt) {
      topFlexAmt = periodTotals[cat];
      topFlexCat = cat;
    }
  }

  let savingTip: string | null = null;
  if (topFlexCat && topFlexAmt > 0 && overview.spentInPeriod > 0) {
    const sharePct = Math.round((topFlexAmt / overview.spentInPeriod) * 100);
    const save10 = round2(topFlexAmt * 0.1);
    savingTip = `${topFlexCat} is ${sharePct}% of your spending. Cutting 10% would save ${formatMoney(save10)}.`;
  }

  return {
    biggestCategory,
    weekOverWeekPct,
    hasWeekOverWeek,
    avgDailySpend: overview.avgDailySpend,
    projectedBalanceAtEnd: overview.projectedBalanceAtEnd,
    runwayDays: overview.runwayDays,
    outOfMoney: overview.outOfMoney,
    savingTip,
    upcomingSubscriptions: computeUpcomingSubscriptions(subscriptions, todayIso)
  };
}
