import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const esc = (value: unknown) => {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};
const csv = (rows: unknown[][], filename: string) => new NextResponse(rows.map((row) => row.map(esc).join(",")).join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=${filename}` } });
const date = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

export async function GET(request: NextRequest) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const searchParams = new URL(request.url).searchParams;
  if (searchParams.get("scope") === "budget-history") {
    const start = date(searchParams.get("start")); const end = date(searchParams.get("end"));
    if ((start && !end) || (!start && end) || (start && end && start > end)) return NextResponse.json({ error: "Choose both valid export dates, with the end date on or after the start date." }, { status: 400 });
    const [{ data: budgets, error: budgetsError }, { data: categories, error: categoriesError }, { data: transactions, error: transactionsError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from("budgets").select("*").order("starts_on", { ascending: false }), supabase.from("categories").select("id,name"), supabase.from("transactions").select("category_id,amount,transaction_date,type"), supabase.from("user_settings").select("currency,emergency_reserve,upcoming_commitments,theme,small_purchase_threshold,onboarding_status,budget_watch_enabled,budget_watch_warning_percent,budget_watch_critical_percent,budget_watch_warning_label,budget_watch_warning_color,budget_watch_critical_label,budget_watch_critical_color,backup_reminder_last_acknowledged_on").single(),
    ]);
    const error = budgetsError ?? categoriesError ?? transactionsError ?? settingsError;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
    const currency = settings?.currency ?? "INR";
    const budgetRows = (budgets ?? []).filter((budget) => !start || !end || (budget.starts_on <= end && budget.ends_on >= start)).map((budget) => {
      const periodStart = start && start > budget.starts_on ? start : budget.starts_on;
      const periodEnd = end && end < budget.ends_on ? end : budget.ends_on;
      const spent = (transactions ?? []).filter((transaction) => transaction.type === "expense" && transaction.category_id === budget.category_id && transaction.transaction_date >= periodStart && transaction.transaction_date <= periodEnd).reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
      const amount = Number(budget.amount ?? 0);
      return ["budget", categoryNames.get(budget.category_id) ?? "Archived category", budget.starts_on, budget.ends_on, periodStart, periodEnd, amount, spent, amount - spent, amount > 0 ? (spent / amount) * 100 : 0, budget.budget_watch_warning_percent ?? "", budget.budget_watch_critical_percent ?? "", currency, "", ""];
    });
    const preferenceRows = Object.entries({ currency, emergency_reserve: settings?.emergency_reserve, upcoming_commitments: settings?.upcoming_commitments, theme: settings?.theme, small_purchase_threshold: settings?.small_purchase_threshold, onboarding_status: settings?.onboarding_status, budget_watch_enabled: settings?.budget_watch_enabled, budget_watch_warning_percent: settings?.budget_watch_warning_percent, budget_watch_critical_percent: settings?.budget_watch_critical_percent, budget_watch_warning_label: settings?.budget_watch_warning_label, budget_watch_warning_color: settings?.budget_watch_warning_color, budget_watch_critical_label: settings?.budget_watch_critical_label, budget_watch_critical_color: settings?.budget_watch_critical_color, backup_reminder_last_acknowledged_on: settings?.backup_reminder_last_acknowledged_on }).map(([key, value]) => ["preference", "", "", "", start ?? "", end ?? "", "", "", "", "", "", "", currency, key, value ?? ""]);
    const suffix = start && end ? `-${start}-to-${end}` : "";
    return csv([["record_type", "category", "budget_starts_on", "budget_ends_on", "export_period_start", "export_period_end", "budget_amount", "spent_in_export_period", "remaining_against_budget", "percent_used", "custom_warning_percent", "custom_critical_percent", "currency", "preference_key", "preference_value"], ...budgetRows, ...preferenceRows], `finwise-budget-history-and-preferences${suffix}.csv`);
  }
  const [{ data: transactions, error }, { data: accounts }, { data: categories }] = await Promise.all([supabase.from("transactions").select("*").order("transaction_date", { ascending: false }), supabase.from("accounts").select("id,name"), supabase.from("categories").select("id,name")]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.name])); const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  return csv([["transaction_date", "type", "amount", "description", "account", "category", "payment_method", "need_want", "notes"], ...(transactions ?? []).filter((item) => item.type !== "transfer").map((item) => [item.transaction_date, item.type, item.amount, item.description, accountNames.get(item.account_id), categoryNames.get(item.category_id), item.payment_method, item.need_want, item.notes])], "finwise-transactions.csv");
}
