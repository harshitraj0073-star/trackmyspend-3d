export const CURRENCY = { code: "INR", symbol: "₹" } as const;

export const STORAGE_KEY = "trackmyspend-v3";
export const LEGACY_STORAGE_KEY = "trackmyspend-v2";
export const MAX_AMOUNT = 100_000_000; // ₹10,00,00,000

export const COLORS = {
  bg: "#070b14",
  emerald: "#10b981",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  rose: "#f43f5e",
  white: "#ffffff",
  slate: "#94a3b8"
} as const;

export const CATEGORIES = [
  "Food",
  "Rent",
  "Transport",
  "Education",
  "Entertainment",
  "Shopping",
  "Health",
  "Other"
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Only flexible categories may receive saving suggestions (never Rent, Education, Health). */
export const FLEXIBLE_CATEGORIES: readonly Category[] = [
  "Food",
  "Entertainment",
  "Shopping",
  "Transport",
  "Other"
];

export const CATEGORY_META: Record<
  Category,
  {
    icon: string;
    color: string;
    shape: "sphere" | "box" | "cone" | "torus" | "octa" | "cylinder" | "dodeca" | "ico";
  }
> = {
  Food: { icon: "🍔", color: "#10b981", shape: "sphere" },
  Rent: { icon: "🏠", color: "#06b6d4", shape: "box" },
  Transport: { icon: "🚇", color: "#38bdf8", shape: "cone" },
  Education: { icon: "📚", color: "#a78bfa", shape: "octa" },
  Entertainment: { icon: "🎮", color: "#f472b6", shape: "torus" },
  Shopping: { icon: "🛍️", color: "#f59e0b", shape: "cylinder" },
  Health: { icon: "💊", color: "#34d399", shape: "dodeca" },
  Other: { icon: "📦", color: "#94a3b8", shape: "ico" }
};

export const PAYMENT_METHODS = ["Cash", "UPI", "Card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const STATIONS = [
  { id: "intro", label: "Intro" },
  { id: "money", label: "Money" },
  { id: "add", label: "Add" },
  { id: "overview", label: "Overview" },
  { id: "budgets", label: "Budgets" },
  { id: "analytics", label: "Analytics" },
  { id: "goals", label: "Goals" },
  { id: "history", label: "History" },
  { id: "insights", label: "Insights" },
  { id: "outro", label: "Outro" }
] as const;

export const STATION_COUNT = STATIONS.length;

export const WARN_RATIO = 0.8;
export const OVER_RATIO = 1;

export const FLY_DURATION = 1.4;
export const PARALLAX_MAX = 0.3;
