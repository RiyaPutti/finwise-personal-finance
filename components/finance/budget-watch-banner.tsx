"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { activeBudgetWatchAlerts } from "@/lib/finance/calculations";
import { useFinance } from "./finance-provider";

export function BudgetWatchBanner() {
  const { budgets, transactions, categories, settings } = useFinance();
  const alerts = activeBudgetWatchAlerts(budgets, transactions, settings);
  if (!alerts.length) return null;
  const critical = alerts.some((alert) => alert.state === "over" || alert.state === "critical");
  const names = alerts.slice(0, 2).map((alert) => categories.find((category) => category.id === alert.budget.category_id)?.name ?? "a category").join(" and ");
  const Icon = critical ? ShieldAlert : AlertTriangle;
  const label = critical ? settings?.budget_watch_critical_label || "Critical" : settings?.budget_watch_warning_label || "Watch";
  const color = critical ? settings?.budget_watch_critical_color || "#C06C5D" : settings?.budget_watch_warning_color || "#B8965A";
  return <div className="mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: `${color}66`, backgroundColor: `${color}18` }}>
    <div className="flex items-start gap-3"><Icon size={18} className="mt-0.5" style={{ color }} /><div><p className="text-sm font-semibold">{label}: {critical ? "your budget watch needs attention" : "a budget is approaching its threshold"}</p><p className="mt-1 text-sm text-[var(--muted)]">{names}{alerts.length > 2 ? ` and ${alerts.length - 2} more` : ""} {alerts.length === 1 ? "is" : "are"} included in this month’s watch.</p></div></div>
    <Link href="/app/budgets" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-[var(--ink)]" style={{ color }}>Review budgets <ArrowRight size={15} /></Link>
  </div>;
}
