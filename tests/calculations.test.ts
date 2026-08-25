import { describe, expect, it } from "vitest";
import { activeBudgetWatchAlerts, backupReminderDue, budgetProgress, budgetWatchStatus, cashFlowForecast, deriveAccountBalances, financialPulse, formatMoney, goalProgress, paymentMethodBreakdown, summaryMetrics, transactionReviewQueue } from "@/lib/finance/calculations";
import { classifyPaymentMethod, defaultPaymentMethodForAccount } from "@/lib/finance/payment-methods";
import { DEFAULT_WORKSPACE_CURRENCY } from "@/lib/finance/currency";
import { defaultWorkspaceSettings } from "@/lib/finance/store";
import type { Account, Budget, Category, GoalContribution, SavingsGoal, Transaction, UserSettings } from "@/lib/finance/types";

const accounts: Account[] = [
  { id: "bank", user_id: "user", name: "Bank", type: "bank", opening_balance: 1000, currency: "USD", is_archived: false, created_at: "2026-01-01" },
  { id: "reserve", user_id: "user", name: "Reserve", type: "cash_reserve", opening_balance: 0, currency: "USD", is_archived: false, created_at: "2026-01-01" },
];
const transaction = (overrides: Partial<Transaction>): Transaction => ({ id: crypto.randomUUID(), user_id: "user", account_id: "bank", category_id: null, type: "expense", transfer_id: null, transfer_direction: null, amount: 10, description: "Test", transaction_date: "2026-08-01", payment_method: "cash", need_want: "need", notes: null, is_recurring: false, recurrence_interval: null, next_due_date: null, created_at: "2026-08-01", ...overrides });

describe("financial ledger calculations", () => {
  it("uses INR only as the unconfigured display preference", () => {
    expect(DEFAULT_WORKSPACE_CURRENCY).toBe("INR");
    expect(defaultWorkspaceSettings.currency).toBe("INR");
    expect(formatMoney(125)).toContain("₹");
    expect(formatMoney(125, "USD")).toContain("$");
  });
  it("derives account balances from opening balances and signed ledger activity", () => {
    const balances = deriveAccountBalances(accounts, [transaction({ type: "income", amount: 200 }), transaction({ type: "expense", amount: 50 }), transaction({ type: "transfer", account_id: "bank", amount: 75, transfer_id: "transfer", transfer_direction: "out" }), transaction({ type: "transfer", account_id: "reserve", amount: 75, transfer_id: "transfer", transfer_direction: "in" })]);
    expect(balances.get("bank")).toBe(1075); expect(balances.get("reserve")).toBe(75);
  });
  it("excludes transfer movements from monthly spending and safe-to-spend calculations", () => {
    const settings: UserSettings = { user_id: "user", currency: "USD", emergency_reserve: 100, upcoming_commitments: 50, theme: "dark", small_purchase_threshold: 20, onboarding_status: "active", budget_watch_enabled: true, budget_watch_warning_percent: 75, budget_watch_critical_percent: 90, budget_watch_warning_label: "Watch", budget_watch_warning_color: "#B8965A", budget_watch_critical_label: "Critical", budget_watch_critical_color: "#C06C5D", backup_reminder_last_acknowledged_on: null };
    const metrics = summaryMetrics(accounts, [transaction({ type: "income", amount: 500, transaction_date: "2026-08-05" }), transaction({ type: "expense", amount: 125, transaction_date: "2026-08-06" }), transaction({ type: "transfer", amount: 200, transfer_id: "transfer", transfer_direction: "out", transaction_date: "2026-08-07" })], settings, new Date("2026-08-20"));
    expect(metrics.spending).toBe(125); expect(metrics.income).toBe(500); expect(metrics.safeToSpend).toBe(1025);
  });
  it("reduces spendable money by emergency reserve and commitments, without going below zero", () => {
    const settings: UserSettings = { user_id: "user", currency: "INR", emergency_reserve: 1200, upcoming_commitments: 300, theme: "dark", small_purchase_threshold: 100, onboarding_status: "active", budget_watch_enabled: true, budget_watch_warning_percent: 75, budget_watch_critical_percent: 90, budget_watch_warning_label: "Watch", budget_watch_warning_color: "#B8965A", budget_watch_critical_label: "Critical", budget_watch_critical_color: "#C06C5D", backup_reminder_last_acknowledged_on: null };
    expect(summaryMetrics(accounts, [], settings).safeToSpend).toBe(0);
    expect(summaryMetrics([{ ...accounts[0], opening_balance: 2000 }, accounts[1]], [], settings).safeToSpend).toBe(500);
  });
  it("calculates budget and savings-goal progress deterministically", () => {
    const budget: Budget = { id: "budget", user_id: "user", category_id: "food", amount: 100, starts_on: "2026-08-01", ends_on: "2026-08-31", budget_watch_warning_percent: null, budget_watch_critical_percent: null };
    expect(budgetProgress(budget, [transaction({ category_id: "food", amount: 120, transaction_date: "2026-08-05" })])).toMatchObject({ spent: 120, remaining: -20, percent: 100 });
    const goal: SavingsGoal = { id: "goal", user_id: "user", name: "Reserve", target_amount: 1000, target_date: null, color: "#BDE66D", is_archived: false, created_at: "2026-08-01" };
    const contributions: GoalContribution[] = [{ id: "one", user_id: "user", goal_id: "goal", amount: 450, contribution_date: "2026-08-01", note: null }];
    expect(goalProgress(goal, contributions)).toMatchObject({ current: 450, remaining: 550, percent: 45 });
  });
  it("evaluates monthly budget-watch thresholds in-app without scheduled delivery", () => {
    const budget: Budget = { id: "budget", user_id: "user", category_id: "food", amount: 100, starts_on: "2026-08-01", ends_on: "2026-08-31", budget_watch_warning_percent: null, budget_watch_critical_percent: null };
    const settings: UserSettings = { user_id: "user", currency: "INR", emergency_reserve: 0, upcoming_commitments: 0, theme: "dark", small_purchase_threshold: 100, onboarding_status: "active", budget_watch_enabled: true, budget_watch_warning_percent: 75, budget_watch_critical_percent: 90, budget_watch_warning_label: "Watch", budget_watch_warning_color: "#B8965A", budget_watch_critical_label: "Critical", budget_watch_critical_color: "#C06C5D", backup_reminder_last_acknowledged_on: null };
    expect(budgetWatchStatus(budget, [transaction({ category_id: "food", amount: 78, transaction_date: "2026-08-10" })], settings, new Date("2026-08-12"))).toMatchObject({ state: "warning", active: true });
    expect(budgetWatchStatus(budget, [transaction({ category_id: "food", amount: 96, transaction_date: "2026-08-10" })], settings, new Date("2026-08-12"))).toMatchObject({ state: "critical", active: true });
    expect(budgetWatchStatus(budget, [transaction({ category_id: "food", amount: 110, transaction_date: "2026-08-10" })], settings, new Date("2026-08-12"))).toMatchObject({ state: "over", active: true });
    expect(activeBudgetWatchAlerts([budget], [transaction({ category_id: "food", amount: 25, transaction_date: "2026-08-10" })], settings, new Date("2026-08-12"))).toHaveLength(0);
    expect(activeBudgetWatchAlerts([budget], [transaction({ category_id: "food", amount: 80, transaction_date: "2026-08-10" })], { ...settings, budget_watch_enabled: false }, new Date("2026-08-12"))).toHaveLength(0);
    expect(budgetWatchStatus({ ...budget, budget_watch_warning_percent: 85, budget_watch_critical_percent: 95 }, [transaction({ category_id: "food", amount: 80, transaction_date: "2026-08-10" })], settings, new Date("2026-08-12"))).toMatchObject({ state: "healthy", active: true });
    expect(backupReminderDue(settings, new Date("2026-08-12"))).toBe(true);
    expect(backupReminderDue({ ...settings, backup_reminder_last_acknowledged_on: "2026-08-01" }, new Date("2026-08-12"))).toBe(false);
    expect(backupReminderDue({ ...settings, backup_reminder_last_acknowledged_on: "2026-07-01" }, new Date("2026-08-12"))).toBe(true);
  });
  it("keeps Cash, Online, and Unknown payment methods distinct", () => {
    expect(classifyPaymentMethod("cash")).toBe("cash");
    expect(classifyPaymentMethod("upi")).toBe("online");
    expect(classifyPaymentMethod(null)).toBe("unknown");
    expect(paymentMethodBreakdown([transaction({ amount: 20, payment_method: "cash" }), transaction({ amount: 30, payment_method: "credit_card" }), transaction({ amount: 40, payment_method: null })])).toEqual({ cash: 20, online: 30, unknown: 40 });
  });
  it("defaults Cash Wallets to Cash, restores account history, and only falls back to UPI for standard banks", () => {
    expect(defaultPaymentMethodForAccount("cash", "upi")).toBe("cash");
    expect(defaultPaymentMethodForAccount("bank", "upi")).toBe("upi");
    expect(defaultPaymentMethodForAccount("bank", "cash")).toBe("upi");
    expect(defaultPaymentMethodForAccount("bank")).toBe("upi");
    expect(defaultPaymentMethodForAccount("credit_card")).toBeNull();
    expect(defaultPaymentMethodForAccount("other")).toBeNull();
  });
  it("forecasts only recorded recurring income and expenses over the next 30 days", () => {
    const settings: UserSettings = { user_id: "user", currency: "USD", emergency_reserve: 100, upcoming_commitments: 50, theme: "dark", small_purchase_threshold: 20, onboarding_status: "active", budget_watch_enabled: true, budget_watch_warning_percent: 75, budget_watch_critical_percent: 90, budget_watch_warning_label: "Watch", budget_watch_warning_color: "#B8965A", budget_watch_critical_label: "Critical", budget_watch_critical_color: "#C06C5D", backup_reminder_last_acknowledged_on: null };
    const forecast = cashFlowForecast(accounts, [transaction({ type: "income", amount: 500, is_recurring: true, recurrence_interval: "monthly", next_due_date: "2026-08-21" }), transaction({ type: "expense", amount: 200, is_recurring: true, recurrence_interval: "monthly", next_due_date: "2026-08-22" })], settings, 30, new Date("2026-08-20"));
    expect(forecast.startingSafeToSpend).toBe(1150);
    expect(forecast.endingSafeToSpend).toBe(1450);
    expect(forecast.recurringItems).toBe(2);
    expect(forecast.days).toHaveLength(30);
    expect(forecast.days.find((day) => day.date === "2026-08-22")).toMatchObject({ expense: 200, projectedSafeToSpend: 1450 });
    const constrainedForecast = cashFlowForecast([{ ...accounts[0], opening_balance: 0 }, accounts[1]], [], settings, 30, new Date("2026-08-20"));
    expect(constrainedForecast).toMatchObject({ startingSafeToSpend: 0, endingSafeToSpend: 0 });
  });
  it("derives a financial pulse and review queue from existing ledger entries without mutating them", () => {
    const categories: Category[] = [{ id: "food", user_id: "user", name: "Food", icon: "utensils", color: "#B8965A", is_archived: false }];
    const entries = [
      transaction({ id: "previous", category_id: "food", amount: 50, transaction_date: "2026-07-10" }),
      transaction({ id: "current", category_id: "food", amount: 125, transaction_date: "2026-08-10" }),
      transaction({ id: "one", category_id: "food", amount: 10, transaction_date: "2026-08-04" }),
      transaction({ id: "two", category_id: "food", amount: 12, transaction_date: "2026-08-05" }),
      transaction({ id: "three", category_id: "food", amount: 14, transaction_date: "2026-08-06" }),
      transaction({ id: "unusual", category_id: "food", amount: 100, transaction_date: "2026-08-07", notes: null }),
      transaction({ id: "uncategorized", category_id: null, amount: 20, transaction_date: "2026-08-08" }),
    ];
    const pulse = financialPulse(accounts, entries, categories, null, new Date("2026-08-20"));
    expect(pulse).toMatchObject({ currentSpending: 281, previousSpending: 50, spendingChange: 231, topCategory: { name: "Food", value: 261 }, emergingCategory: { name: "Food", increase: 211 } });
    const review = transactionReviewQueue(entries);
    expect(review.map((item) => item.transaction.id)).toEqual(["current", "uncategorized", "unusual"]);
    expect(review.find((item) => item.transaction.id === "uncategorized")?.reasons).toEqual(["uncategorized"]);
    expect(review.find((item) => item.transaction.id === "unusual")?.reasons).toEqual(["unusual"]);
  });
});
