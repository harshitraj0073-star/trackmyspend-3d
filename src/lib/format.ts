import { CURRENCY, MAX_AMOUNT } from "./constants";

const wholeMoneyFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const paiseMoneyFmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formats money using en-IN with ₹ symbol; whole rupees unless paise exist. */
export function formatMoney(value: number): string {
  const rounded = round2(Number.isFinite(value) ? value : 0);
  const sign = rounded < 0 ? "−" : "";
  const abs = Math.abs(rounded);
  const hasPaise = Math.abs(abs - Math.round(abs)) > 0.001;
  const formatted = hasPaise ? paiseMoneyFmt.format(abs) : wholeMoneyFmt.format(abs);
  return `${sign}${CURRENCY.symbol}${formatted}`;
}

export function formatShortDate(iso: string): string {
  return dateFmt.format(fromISODate(iso));
}

export function formatLongDate(iso: string): string {
  return longDateFmt.format(fromISODate(iso));
}

export function formatPercent(ratio: number, decimals = 0): string {
  const pct = round2(ratio * 100);
  return decimals > 0 ? `${pct.toFixed(decimals)}%` : `${Math.round(pct)}%`;
}

/** Local YYYY-MM-DD for a Date (no timezone shift). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string as a local midnight Date. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** End of the current month in local YYYY-MM-DD. */
export function endOfMonthISO(d: Date = new Date()): string {
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Signed whole calendar days from startIso to endIso in local time (handles DST & year rollover). */
export function daysBetween(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = endIso.slice(0, 10).split("-").map(Number);
  const utcStart = Date.UTC(sy, (sm || 1) - 1, sd || 1);
  const utcEnd = Date.UTC(ey, (em || 1) - 1, ed || 1);
  return Math.round((utcEnd - utcStart) / 86_400_000);
}

export function shiftDaysISO(iso: string, deltaDays: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + deltaDays);
  return toISODate(d);
}

export interface ValidationResult {
  ok: boolean;
  value: number;
  error: string | null;
}

/** Strictly validates positive transaction/budget/goal amounts (> 0, <= 10,00,00,000, max 2 decimals). */
export function validatePositiveAmount(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, value: 0, error: "Amount is required." };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, value: 0, error: "Enter a positive number with up to 2 decimal places." };
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) {
    return { ok: false, value: 0, error: "Amount must be greater than 0." };
  }
  if (num > MAX_AMOUNT) {
    return { ok: false, value: 0, error: `Amount cannot exceed ${formatMoney(MAX_AMOUNT)}.` };
  }
  return { ok: true, value: round2(num), error: null };
}

/** Validates non-negative balances or optional limits (>= 0, <= 10,00,00,000, max 2 decimals). */
export function validateNonNegativeAmount(raw: string, allowEmpty = false): ValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return allowEmpty
      ? { ok: true, value: 0, error: null }
      : { ok: false, value: 0, error: "Enter an amount (0 or higher)." };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, value: 0, error: "Enter a non-negative number with up to 2 decimal places." };
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) {
    return { ok: false, value: 0, error: "Amount cannot be negative." };
  }
  if (num > MAX_AMOUNT) {
    return { ok: false, value: 0, error: `Amount cannot exceed ${formatMoney(MAX_AMOUNT)}.` };
  }
  return { ok: true, value: round2(num), error: null };
}

let idCounter = 0;

export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}
