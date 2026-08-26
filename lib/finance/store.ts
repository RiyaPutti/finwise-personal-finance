"use client";

import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import type { Account, Budget, Category, FinanceSnapshot, GoalContribution, Receipt, RecurringBill, SavingsGoal, Transaction, TransactionInput, UserSettings } from "./types";
import { parseBackup } from "./import";
import { DEFAULT_WORKSPACE_CURRENCY } from "./currency";

export const defaultWorkspaceSettings: UserSettings = { user_id: "", currency: DEFAULT_WORKSPACE_CURRENCY, emergency_reserve: 0, upcoming_commitments: 0, theme: "dark", small_purchase_threshold: 100, onboarding_status: "active", budget_watch_enabled: true, budget_watch_warning_percent: 75, budget_watch_critical_percent: 90, budget_watch_warning_label: "Watch", budget_watch_warning_color: "#B8965A", budget_watch_critical_label: "Critical", budget_watch_critical_color: "#C06C5D", backup_reminder_last_acknowledged_on: null };
const defaultSettings = defaultWorkspaceSettings;
const emptySnapshot: FinanceSnapshot = { profile: null, settings: defaultSettings, accounts: [], categories: [], transactions: [], budgets: [], goals: [], contributions: [], recurringBills: [], receipts: [] };
// Planning records enhance the workspace but must never block the established ledger.
// PGRST205/204 and 42P01 cover an unapplied migration or stale API schema cache; 42501
// covers an already-created table whose authenticated table grants are still pending.
const optionalPersistenceErrorCodes = new Set(["42P01", "42501", "PGRST204", "PGRST205"]);
const normalize = <T extends Record<string, unknown>>(record: T): T => {
  const numeric = ["amount", "opening_balance", "target_amount", "emergency_reserve", "upcoming_commitments", "small_purchase_threshold", "budget_watch_warning_percent", "budget_watch_critical_percent"];
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, numeric.includes(key) ? (value === null ? null : Number(value ?? 0)) : value])) as T;
};

async function currentUserId() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Your session has ended. Please sign in again.");
  await supabase.rpc("ensure_current_user_workspace");
  return user.id;
}

async function querySnapshot(): Promise<FinanceSnapshot> {
  const supabase = createClient();
  const userId = await currentUserId();
  const results = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("id", userId).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("accounts").select("*").order("created_at", { ascending: true }),
    supabase.from("categories").select("*").order("name", { ascending: true }),
    supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("budgets").select("*").order("starts_on", { ascending: false }),
    supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
    supabase.from("goal_contributions").select("*").order("contribution_date", { ascending: false }),
    supabase.from("recurring_bills").select("*").order("next_due_date", { ascending: true }),
    supabase.from("receipts").select("*").order("created_at", { ascending: false }),
  ]);
  const error = results.slice(0, 8).map((result) => result.error).find(Boolean);
  if (error) throw error;
  const optionalError = results.slice(8).map((result) => result.error).find((queryError) => queryError && !optionalPersistenceErrorCodes.has(queryError.code ?? ""));
  if (optionalError) throw optionalError;
  return {
    profile: results[0].data ? normalize(results[0].data) : null,
    settings: results[1].data ? normalize(results[1].data) as UserSettings : defaultSettings,
    accounts: (results[2].data ?? []).map(normalize) as Account[], categories: (results[3].data ?? []).map(normalize) as Category[],
    transactions: (results[4].data ?? []).map(normalize) as Transaction[], budgets: (results[5].data ?? []).map(normalize) as Budget[],
    goals: (results[6].data ?? []).map(normalize) as SavingsGoal[], contributions: (results[7].data ?? []).map(normalize) as GoalContribution[],
    recurringBills: (results[8].data ?? []).map(normalize) as RecurringBill[], receipts: (results[9].data ?? []).map(normalize) as Receipt[],
  };
}

async function mutate(action: string, data: Record<string, unknown> = {}) {
  const response = await fetch("/api/ledger", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, data }) });
  const payload = await response.json().catch(() => ({ error: "Unable to complete this request." }));
  if (!response.ok) throw new Error(payload.error ?? "Unable to complete this request.");
}

export const financeStore = {
  emptySnapshot,
  refresh: querySnapshot,
  async saveAccount(input: Pick<Account, "name" | "type" | "opening_balance" | "currency">, id?: string) {
    await mutate("account.save", { input, id });
  },
  async archiveAccount(id: string, is_archived = true) {
    await mutate("account.archive", { id, is_archived });
  },
  async deleteAccount(id: string) {
    await mutate("account.delete", { id });
  },
  async saveCategory(input: Pick<Category, "name" | "icon" | "color">, id?: string) {
    await mutate("category.save", { input, id });
  },
  async saveTransaction(input: TransactionInput, id?: string) {
    await mutate("transaction.save", { input, id });
  },
  async deleteTransaction(id: string) {
    await mutate("transaction.delete", { id });
  },
  async createTransfer(input: { source_account_id: string; destination_account_id: string; amount: number; description: string; transaction_date: string; notes?: string | null }) {
    await mutate("transfer.create", { input });
  },
  async saveBudget(input: Pick<Budget, "category_id" | "amount" | "starts_on" | "ends_on"> & Partial<Pick<Budget, "budget_watch_warning_percent" | "budget_watch_critical_percent">>, id?: string) {
    await mutate("budget.save", { input, id });
  },
  async deleteBudget(id: string) { await mutate("budget.delete", { id }); },
  async saveGoal(input: Pick<SavingsGoal, "name" | "target_amount" | "target_date" | "color">, id?: string) {
    await mutate("goal.save", { input, id });
  },
  async deleteGoal(id: string) { await mutate("goal.delete", { id }); },
  async contributeToGoal(goal_id: string, amount: number, note?: string) {
    await mutate("goal.contribute", { goal_id, amount, note });
  },
  async saveRecurringBill(input: Omit<RecurringBill, "id" | "user_id" | "created_at" | "updated_at">, id?: string) { await mutate("recurringBill.save", { input, id }); },
  async deleteRecurringBill(id: string) { await mutate("recurringBill.delete", { id }); },
  async deleteReceipt(id: string) { await mutate("receipt.delete", { id }); },
  async updateSettings(input: Partial<UserSettings>) {
    await mutate("settings.update", { input });
  },
  async updateProfile(display_name: string) { await mutate("profile.update", { display_name }); },
  async exportJson() { return JSON.stringify(await querySnapshot(), null, 2); },
  async importJson(raw: string, replace = false) {
    await mutate("backup.import", { backup: parseBackup(raw), replace });
  },
  async importCsv(raw: string, accounts: Account[], categories: Category[]) {
    const parsed = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: "greedy" });
    if (parsed.errors.length) throw new Error(`CSV validation failed: ${parsed.errors[0].message}`);
    const accountLookup = new Map(accounts.map((account) => [account.name.toLowerCase(), account.id]));
    const categoryLookup = new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));
    const rows = parsed.data.map((row, index) => {
      const account_id = accountLookup.get((row.account ?? "").toLowerCase());
      if (!account_id) throw new Error(`Row ${index + 2}: account \"${row.account}\" was not found.`);
      const amount = Number(row.amount); if (!(amount > 0)) throw new Error(`Row ${index + 2}: amount must be positive.`);
      if (row.type !== "income" && row.type !== "expense") throw new Error(`Row ${index + 2}: type must be income or expense.`);
      return { user_id: "", account_id, category_id: categoryLookup.get((row.category ?? "").toLowerCase()) ?? null, type: row.type, amount, description: row.description || "Imported transaction", transaction_date: row.transaction_date, payment_method: row.payment_method || null, need_want: row.need_want || null, notes: row.notes || null };
    });
    await mutate("transaction.import", { rows });
  },
};
