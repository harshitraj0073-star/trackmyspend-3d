import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  CATEGORIES,
  LEGACY_STORAGE_KEY,
  MAX_AMOUNT,
  PAYMENT_METHODS,
  STORAGE_KEY,
  type Category,
  type PaymentMethod
} from "../lib/constants";
import {
  computeOverview,
  getDueAutoLogSubscriptions,
  validateGoalTransfer,
  type Budget,
  type Expense,
  type Goal,
  type Profile,
  type Subscription,
  type TxType
} from "../lib/calc";
import { endOfMonthISO, round2, toISODate, uid } from "../lib/format";

export type { Budget, Expense, Goal, Profile, Subscription, TxType };
export type EffectsLevel = "high" | "low";

export interface Settings {
  effects: EffectsLevel;
  simpleView: boolean;
}

export interface PersistedSlice {
  profile: Profile;
  expenses: Expense[];
  budgets: Budget[];
  goals: Goal[];
  subscriptions: Subscription[];
  settings: Settings;
}

export interface UiSlice {
  selectedStation: number;
  focus: string | null;
  lastAddedId: string | null;
  perfLow: boolean;
  webglFailed: boolean;
}

export interface Actions {
  saveProfile: (input: {
    startingBalance: number;
    monthlyIncome: number;
    periodEnd: string;
    overallLimit: number | null;
  }) => void;
  addExpense: (e: Omit<Expense, "id">) => Expense;
  updateExpense: (id: string, patch: Partial<Omit<Expense, "id">>) => void;
  deleteExpense: (id: string) => void;
  setBudget: (category: Category, monthlyLimit: number) => void;
  removeBudget: (category: Category) => void;
  addGoal: (name: string, target: number, deadline?: string) => void;
  adjustGoal: (id: string, delta: number) => { ok: boolean; error: string | null };
  deleteGoal: (id: string) => void;
  addSubscription: (s: Omit<Subscription, "id" | "lastLoggedMonth">) => void;
  toggleSubscriptionAutoLog: (id: string) => void;
  deleteSubscription: (id: string) => void;
  runAutoLogSubscriptions: () => number;
  exportBackupJson: () => string;
  importBackupJson: (raw: string) => { ok: boolean; error: string | null };
  setSettings: (patch: Partial<Settings>) => void;
  setSelectedStation: (i: number) => void;
  setFocus: (key: string | null) => void;
  setPerfLow: (low: boolean) => void;
  setWebglFailed: (failed: boolean) => void;
  resetAllData: () => void;
}

export type StoreState = PersistedSlice & UiSlice & Actions;

/** Wipe legacy v2 mock/demo storage on first load so old fake data can never reappear. */
export function purgeLegacyStorage(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
}

purgeLegacyStorage();

export function createEmptyProfile(now: Date = new Date()): Profile {
  return {
    startingBalance: 0,
    monthlyIncome: 0,
    periodStart: toISODate(now),
    periodEnd: endOfMonthISO(now),
    overallLimit: null,
    setupComplete: false
  };
}

function emptyPersistedState(now: Date = new Date()): PersistedSlice {
  return {
    profile: createEmptyProfile(now),
    expenses: [],
    budgets: [],
    goals: [],
    subscriptions: [],
    settings: { effects: "high", simpleView: false }
  };
}

function isValidCategory(val: unknown): val is Category {
  return typeof val === "string" && (CATEGORIES as readonly string[]).includes(val);
}

function isValidMethod(val: unknown): val is PaymentMethod {
  return typeof val === "string" && (PAYMENT_METHODS as readonly string[]).includes(val);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...emptyPersistedState(),
      selectedStation: 0,
      focus: null,
      lastAddedId: null,
      perfLow: false,
      webglFailed: false,

      saveProfile: ({ startingBalance, monthlyIncome, periodEnd, overallLimit }) =>
        set((s) => ({
          profile: {
            startingBalance: round2(Math.max(0, startingBalance)),
            monthlyIncome: round2(Math.max(0, monthlyIncome)),
            periodStart: s.profile.setupComplete ? s.profile.periodStart : toISODate(new Date()),
            periodEnd,
            overallLimit:
              overallLimit !== null && overallLimit > 0 ? round2(overallLimit) : null,
            setupComplete: true
          }
        })),

      addExpense: (e) => {
        const tx: Expense = { ...e, id: uid("tx"), amount: round2(e.amount) };
        set((s) => ({ expenses: [tx, ...s.expenses], lastAddedId: tx.id }));
        return tx;
      },

      updateExpense: (id, patch) =>
        set((s) => ({
          expenses: s.expenses.map((x) =>
            x.id === id
              ? {
                  ...x,
                  ...patch,
                  amount: patch.amount !== undefined ? round2(patch.amount) : x.amount
                }
              : x
          )
        })),

      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),

      setBudget: (category, monthlyLimit) =>
        set((s) => {
          const limit = round2(Math.max(0, monthlyLimit));
          if (limit <= 0) {
            return { budgets: s.budgets.filter((b) => b.category !== category) };
          }
          const exists = s.budgets.some((b) => b.category === category);
          const budgets = exists
            ? s.budgets.map((b) => (b.category === category ? { ...b, monthlyLimit: limit } : b))
            : [...s.budgets, { category, monthlyLimit: limit }];
          return { budgets };
        }),

      removeBudget: (category) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.category !== category) })),

      addGoal: (name, target, deadline) =>
        set((s) => ({
          goals: [
            ...s.goals,
            {
              id: uid("goal"),
              name: name.trim(),
              target: round2(Math.max(1, target)),
              saved: 0,
              deadline: deadline || undefined,
              createdAt: new Date().toISOString()
            }
          ]
        })),

      adjustGoal: (id, delta) => {
        const state = get();
        const goal = state.goals.find((g) => g.id === id);
        if (!goal) return { ok: false, error: "Goal not found." };
        const cleanDelta = round2(delta);
        const overview = computeOverview(
          state.profile,
          state.expenses,
          state.goals,
          toISODate(new Date())
        );
        const check = validateGoalTransfer(cleanDelta, overview.currentBalance, goal.saved);
        if (!check.ok) return check;
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, saved: round2(Math.max(0, g.saved + cleanDelta)) } : g
          )
        }));
        return { ok: true, error: null };
      },

      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addSubscription: (sub) =>
        set((s) => ({
          subscriptions: [
            ...s.subscriptions,
            {
              ...sub,
              id: uid("sub"),
              name: sub.name.trim(),
              amount: round2(sub.amount),
              dayOfMonth: Math.min(31, Math.max(1, Math.round(sub.dayOfMonth)))
            }
          ]
        })),

      toggleSubscriptionAutoLog: (id) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((sub) =>
            sub.id === id ? { ...sub, autoLog: !sub.autoLog } : sub
          )
        })),

      deleteSubscription: (id) =>
        set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) })),

      runAutoLogSubscriptions: () => {
        const state = get();
        if (!state.profile.setupComplete || state.subscriptions.length === 0) return 0;
        const todayIso = toISODate(new Date());
        const dueList = getDueAutoLogSubscriptions(state.subscriptions, todayIso);
        if (dueList.length === 0) return 0;

        const newExpenses: Expense[] = dueList.map(({ sub, dueDate }) => ({
          id: uid("subtx"),
          amount: sub.amount,
          category: sub.category,
          date: dueDate,
          note: `${sub.name} (auto-logged subscription)`,
          method: "UPI",
          type: "expense"
        }));

        const dueIds = new Map(dueList.map((d) => [d.sub.id, d.monthKey]));
        set((s) => ({
          expenses: [...newExpenses, ...s.expenses],
          subscriptions: s.subscriptions.map((sub) =>
            dueIds.has(sub.id) ? { ...sub, lastLoggedMonth: dueIds.get(sub.id) } : sub
          )
        }));
        return newExpenses.length;
      },

      exportBackupJson: () => {
        const s = get();
        const payload: PersistedSlice & { exportedAt: string; schemaVersion: number } = {
          schemaVersion: 3,
          exportedAt: new Date().toISOString(),
          profile: s.profile,
          expenses: s.expenses,
          budgets: s.budgets,
          goals: s.goals,
          subscriptions: s.subscriptions,
          settings: s.settings
        };
        return JSON.stringify(payload, null, 2);
      },

      importBackupJson: (raw) => {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object") {
            return { ok: false, error: "Invalid JSON backup file." };
          }
          const obj = parsed as Record<string, unknown>;
          const prof = obj.profile as Record<string, unknown> | undefined;
          if (!prof || typeof prof.startingBalance !== "number") {
            return { ok: false, error: "Backup is missing valid profile data." };
          }
          const cleanProfile: Profile = {
            startingBalance: round2(Math.max(0, Math.min(MAX_AMOUNT, prof.startingBalance))),
            monthlyIncome: round2(
              Math.max(0, Math.min(MAX_AMOUNT, Number(prof.monthlyIncome) || 0))
            ),
            periodStart:
              typeof prof.periodStart === "string" ? prof.periodStart.slice(0, 10) : toISODate(new Date()),
            periodEnd:
              typeof prof.periodEnd === "string" ? prof.periodEnd.slice(0, 10) : endOfMonthISO(new Date()),
            overallLimit:
              typeof prof.overallLimit === "number" && prof.overallLimit > 0
                ? round2(prof.overallLimit)
                : null,
            setupComplete: Boolean(prof.setupComplete)
          };

          const rawExpenses = Array.isArray(obj.expenses) ? obj.expenses : [];
          const cleanExpenses: Expense[] = rawExpenses
            .filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"))
            .map((x) => ({
              id: typeof x.id === "string" ? x.id : uid("tx"),
              amount: round2(Math.max(0.01, Math.min(MAX_AMOUNT, Number(x.amount) || 0))),
              category: isValidCategory(x.category) ? x.category : "Other",
              date: typeof x.date === "string" ? x.date.slice(0, 10) : toISODate(new Date()),
              note: typeof x.note === "string" ? x.note.slice(0, 120) : "",
              method: isValidMethod(x.method) ? x.method : "UPI",
              type: (x.type === "income" ? "income" : "expense") as TxType
            }))
            .filter((x) => x.amount > 0);

          const rawBudgets = Array.isArray(obj.budgets) ? obj.budgets : [];
          const cleanBudgets: Budget[] = rawBudgets
            .filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"))
            .filter((x) => isValidCategory(x.category) && Number(x.monthlyLimit) > 0)
            .map((x) => ({
              category: x.category as Category,
              monthlyLimit: round2(Number(x.monthlyLimit))
            }));

          const rawGoals = Array.isArray(obj.goals) ? obj.goals : [];
          const cleanGoals: Goal[] = rawGoals
            .filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"))
            .filter((x) => typeof x.name === "string" && Number(x.target) > 0)
            .map((x) => ({
              id: typeof x.id === "string" ? x.id : uid("goal"),
              name: String(x.name).trim(),
              target: round2(Number(x.target)),
              saved: round2(Math.max(0, Number(x.saved) || 0)),
              deadline: typeof x.deadline === "string" ? x.deadline : undefined,
              createdAt: typeof x.createdAt === "string" ? x.createdAt : new Date().toISOString()
            }));

          const rawSubs = Array.isArray(obj.subscriptions) ? obj.subscriptions : [];
          const cleanSubs: Subscription[] = rawSubs
            .filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"))
            .filter((x) => typeof x.name === "string" && Number(x.amount) > 0)
            .map((x) => ({
              id: typeof x.id === "string" ? x.id : uid("sub"),
              name: String(x.name).trim(),
              amount: round2(Number(x.amount)),
              dayOfMonth: Math.min(31, Math.max(1, Math.round(Number(x.dayOfMonth) || 1))),
              category: isValidCategory(x.category) ? x.category : "Other",
              autoLog: Boolean(x.autoLog),
              lastLoggedMonth: typeof x.lastLoggedMonth === "string" ? x.lastLoggedMonth : undefined
            }));

          set({
            profile: cleanProfile,
            expenses: cleanExpenses,
            budgets: cleanBudgets,
            goals: cleanGoals,
            subscriptions: cleanSubs,
            focus: null
          });
          return { ok: true, error: null };
        } catch {
          return { ok: false, error: "Could not parse JSON backup." };
        }
      },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setSelectedStation: (i) => set({ selectedStation: i }),
      setFocus: (key) => set({ focus: key }),
      setPerfLow: (low) => set({ perfLow: low }),
      setWebglFailed: (failed) => set({ webglFailed: failed }),

      resetAllData: () => {
        purgeLegacyStorage();
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // Ignore storage errors
        }
        set({
          ...emptyPersistedState(),
          selectedStation: 1,
          focus: null,
          lastAddedId: null
        });
      }
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted: unknown, version: number): PersistedSlice => {
        purgeLegacyStorage();
        if (version < 3 || !persisted || typeof persisted !== "object") {
          return emptyPersistedState();
        }
        const p = persisted as Partial<PersistedSlice>;
        return {
          profile: p.profile ?? createEmptyProfile(),
          expenses: Array.isArray(p.expenses) ? p.expenses : [],
          budgets: Array.isArray(p.budgets) ? p.budgets : [],
          goals: Array.isArray(p.goals) ? p.goals : [],
          subscriptions: Array.isArray(p.subscriptions) ? p.subscriptions : [],
          settings: p.settings ?? { effects: "high", simpleView: false }
        };
      },
      partialize: (s): PersistedSlice => ({
        profile: s.profile,
        expenses: s.expenses,
        budgets: s.budgets,
        goals: s.goals,
        subscriptions: s.subscriptions,
        settings: s.settings
      })
    }
  )
);
