import { useMemo } from "react";
import {
  computeAnalytics,
  computeBudgetSummary,
  computeGoals,
  computeInsightsReport,
  computeOverview,
  type AnalyticsData,
  type BudgetSummary,
  type GoalProgress,
  type InsightsReport,
  type OverviewMetrics,
  type Range
} from "../lib/calc";
import { toISODate } from "../lib/format";
import { useStore } from "./useStore";

export type { AnalyticsData, BudgetSummary, GoalProgress, InsightsReport, OverviewMetrics, Range };

export function todayKey(): string {
  return toISODate(new Date());
}

export function useOverview(): OverviewMetrics {
  const profile = useStore((s) => s.profile);
  const expenses = useStore((s) => s.expenses);
  const goals = useStore((s) => s.goals);
  const today = todayKey();
  return useMemo(
    () => computeOverview(profile, expenses, goals, today),
    [profile, expenses, goals, today]
  );
}

export function useBudgetSummary(): BudgetSummary {
  const profile = useStore((s) => s.profile);
  const expenses = useStore((s) => s.expenses);
  const budgets = useStore((s) => s.budgets);
  const today = todayKey();
  return useMemo(
    () => computeBudgetSummary(profile, expenses, budgets, today),
    [profile, expenses, budgets, today]
  );
}

export function useAnalytics(range: Range): AnalyticsData {
  const expenses = useStore((s) => s.expenses);
  const today = todayKey();
  return useMemo(() => computeAnalytics(expenses, range, today), [expenses, range, today]);
}

export function useGoals(): GoalProgress[] {
  const goals = useStore((s) => s.goals);
  return useMemo(() => computeGoals(goals), [goals]);
}

export function useInsights(): InsightsReport {
  const profile = useStore((s) => s.profile);
  const expenses = useStore((s) => s.expenses);
  const goals = useStore((s) => s.goals);
  const subscriptions = useStore((s) => s.subscriptions);
  const today = todayKey();
  return useMemo(
    () => computeInsightsReport(profile, expenses, goals, subscriptions, today),
    [profile, expenses, goals, subscriptions, today]
  );
}
