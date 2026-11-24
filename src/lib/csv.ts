import type { Expense } from "../store/useStore";

function escapeCell(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function expensesToCsv(expenses: Expense[]): string {
  const header = ["id", "date", "type", "category", "amount", "method", "note"].join(",");
  const rows = expenses.map((e) =>
    [e.id, e.date, e.type, e.category, e.amount, e.method, e.note].map(escapeCell).join(",")
  );
  return [header, ...rows].join("\n");
}

export function downloadExpensesCsv(expenses: Expense[], filename = "trackmyspend-2.0.csv"): void {
  const csv = expensesToCsv(expenses);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
