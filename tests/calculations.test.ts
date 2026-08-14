import { describe, expect, it } from "vitest";
import { budgetProgress, deriveAccountBalances, formatMoney, goalProgress, paymentMethodBreakdown, summaryMetrics } from "@/lib/finance/calculations";
import { classifyPaymentMethod, defaultPaymentMethodForAccount } from "@/lib/finance/payment-methods";
import { DEFAULT_WORKSPACE_CURRENCY } from "@/lib/finance/currency";
import { defaultWorkspaceSettings } from "@/lib/finance/store";
import type { Account, Budget, GoalContribution, SavingsGoal, Transaction, UserSettings } from "@/lib/finance/types";

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
    const settings: UserSettings = { user_id: "user", currency: "USD", emergency_reserve: 100, upcoming_commitments: 50, theme: "dark", small_purchase_threshold: 20 };
    const metrics = summaryMetrics(accounts, [transaction({ type: "income", amount: 500, transaction_date: "2026-08-05" }), transaction({ type: "expense", amount: 125, transaction_date: "2026-08-06" }), transaction({ type: "transfer", amount: 200, transfer_id: "transfer", transfer_direction: "out", transaction_date: "2026-08-07" })], settings, new Date("2026-08-20"));
    expect(metrics.spending).toBe(125); expect(metrics.income).toBe(500); expect(metrics.safeToSpend).toBe(1025);
  });
  it("calculates budget and savings-goal progress deterministically", () => {
    const budget: Budget = { id: "budget", user_id: "user", category_id: "food", amount: 100, starts_on: "2026-08-01", ends_on: "2026-08-31" };
    expect(budgetProgress(budget, [transaction({ category_id: "food", amount: 120, transaction_date: "2026-08-05" })])).toMatchObject({ spent: 120, remaining: -20, percent: 100 });
    const goal: SavingsGoal = { id: "goal", user_id: "user", name: "Reserve", target_amount: 1000, target_date: null, color: "#BDE66D", is_archived: false, created_at: "2026-08-01" };
    const contributions: GoalContribution[] = [{ id: "one", user_id: "user", goal_id: "goal", amount: 450, contribution_date: "2026-08-01", note: null }];
    expect(goalProgress(goal, contributions)).toMatchObject({ current: 450, remaining: 550, percent: 45 });
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
});
