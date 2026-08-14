import { addDays, addMonths, addYears, differenceInCalendarDays, endOfMonth, format, isAfter, isBefore, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import type { Account, AccountType, Budget, Category, GoalContribution, SavingsGoal, Transaction, UserSettings } from "./types";
import { classifyPaymentMethod } from "./payment-methods";
import { DEFAULT_WORKSPACE_CURRENCY } from "./currency";

export const monetary = (value: unknown) => Number(value ?? 0);

export function formatMoney(amount: number, currency = DEFAULT_WORKSPACE_CURRENCY, compact = false) {
  return new Intl.NumberFormat(undefined, {
    style: "currency", currency, maximumFractionDigits: compact ? 0 : 2, notation: compact ? "compact" : "standard",
  }).format(amount);
}

export function dateRangeForMonth(date = new Date()) {
  return { start: format(startOfMonth(date), "yyyy-MM-dd"), end: format(endOfMonth(date), "yyyy-MM-dd") };
}

export function deriveAccountBalances(accounts: Account[], transactions: Transaction[]) {
  const balances = new Map(accounts.map((account) => [account.id, monetary(account.opening_balance)]));
  transactions.forEach((transaction) => {
    const current = balances.get(transaction.account_id) ?? 0;
    const amount = monetary(transaction.amount);
    const delta = transaction.type === "income" || transaction.transfer_direction === "in" ? amount : -amount;
    balances.set(transaction.account_id, current + delta);
  });
  return balances;
}

export function accountBalance(account: Account, transactions: Transaction[]) {
  return deriveAccountBalances([account], transactions).get(account.id) ?? 0;
}

export function isSpendableAccount(type: AccountType) {
  return !["cash_reserve", "savings", "investment", "credit_card"].includes(type);
}

export function summaryMetrics(accounts: Account[], transactions: Transaction[], settings?: UserSettings | null, now = new Date()) {
  const balances = deriveAccountBalances(accounts, transactions);
  const active = accounts.filter((account) => !account.is_archived);
  const balanceOf = (account: Account) => balances.get(account.id) ?? 0;
  const totalBalance = active.reduce((total, account) => total + balanceOf(account), 0);
  const savingsAndReserves = active.filter((account) => ["cash_reserve", "savings", "investment"].includes(account.type)).reduce((total, account) => total + balanceOf(account), 0);
  const available = active.filter((account) => isSpendableAccount(account.type)).reduce((total, account) => total + balanceOf(account), 0);
  const cashInHand = active.filter((account) => account.type === "cash").reduce((total, account) => total + balanceOf(account), 0);
  const range = dateRangeForMonth(now);
  const inMonth = transactions.filter((transaction) => transaction.transaction_date >= range.start && transaction.transaction_date <= range.end);
  const income = inMonth.filter((transaction) => transaction.type === "income").reduce((total, transaction) => total + monetary(transaction.amount), 0);
  const spending = inMonth.filter((transaction) => transaction.type === "expense").reduce((total, transaction) => total + monetary(transaction.amount), 0);
  const reserve = monetary(settings?.emergency_reserve);
  const commitments = monetary(settings?.upcoming_commitments);
  return { totalBalance, savingsAndReserves, available, cashInHand, income, spending, monthlySavings: income - spending, safeToSpend: Math.max(0, available - reserve - commitments), balances };
}

export function periodExpenses(transactions: Transaction[], start: string, end: string) {
  return transactions.filter((transaction) => transaction.type === "expense" && transaction.transaction_date >= start && transaction.transaction_date <= end);
}

export function paymentMethodBreakdown(transactions: Transaction[]) {
  return transactions.reduce((totals, transaction) => {
    const classification = classifyPaymentMethod(transaction.payment_method);
    totals[classification] += monetary(transaction.amount);
    return totals;
  }, { cash: 0, online: 0, unknown: 0 });
}

export function groupedExpensesByCategory(transactions: Transaction[], categories: Category[]) {
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const totals = new Map<string, number>();
  transactions.forEach((transaction) => {
    const name = names.get(transaction.category_id ?? "") ?? "Uncategorised";
    totals.set(name, (totals.get(name) ?? 0) + monetary(transaction.amount));
  });
  return [...totals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function monthlyTrend(transactions: Transaction[], months = 6, now = new Date()) {
  return Array.from({ length: months }, (_, index) => {
    const month = subMonths(now, months - index - 1);
    const { start, end } = dateRangeForMonth(month);
    const scoped = transactions.filter((transaction) => transaction.transaction_date >= start && transaction.transaction_date <= end);
    return {
      label: format(month, "MMM"),
      income: scoped.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + monetary(transaction.amount), 0),
      expense: scoped.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + monetary(transaction.amount), 0),
    };
  });
}

export function budgetProgress(budget: Budget, transactions: Transaction[]) {
  const spent = transactions.filter((transaction) => transaction.type === "expense" && transaction.category_id === budget.category_id && transaction.transaction_date >= budget.starts_on && transaction.transaction_date <= budget.ends_on).reduce((sum, transaction) => sum + monetary(transaction.amount), 0);
  return { spent, remaining: budget.amount - spent, percent: Math.min(100, (spent / budget.amount) * 100) };
}

export type BudgetWatchState = "healthy" | "warning" | "critical" | "over";
export function budgetWatchStatus(budget: Budget, transactions: Transaction[], settings: UserSettings | null | undefined, now = new Date()) {
  const today = format(now, "yyyy-MM-dd");
  const progress = budgetProgress(budget, transactions);
  const rawPercent = budget.amount > 0 ? (progress.spent / budget.amount) * 100 : 0;
  const warning = Number(budget.budget_watch_warning_percent ?? settings?.budget_watch_warning_percent ?? 75);
  const critical = Math.max(warning, Number(budget.budget_watch_critical_percent ?? settings?.budget_watch_critical_percent ?? 90));
  const active = Boolean(settings?.budget_watch_enabled) && budget.starts_on <= today && budget.ends_on >= today;
  const state: BudgetWatchState = !active || rawPercent < warning ? "healthy" : rawPercent >= 100 ? "over" : rawPercent >= critical ? "critical" : "warning";
  return { ...progress, rawPercent, state, active };
}

export function activeBudgetWatchAlerts(budgets: Budget[], transactions: Transaction[], settings: UserSettings | null | undefined, now = new Date()) {
  return budgets.map((budget) => ({ budget, ...budgetWatchStatus(budget, transactions, settings, now) })).filter((alert) => alert.state !== "healthy");
}

export function backupReminderDue(settings: UserSettings | null | undefined, now = new Date()) {
  const acknowledgedOn = settings?.backup_reminder_last_acknowledged_on;
  if (!acknowledgedOn || !/^\d{4}-\d{2}-\d{2}$/.test(acknowledgedOn)) return true;
  return differenceInCalendarDays(now, parseISO(acknowledgedOn)) >= 30;
}

export function goalProgress(goal: SavingsGoal, contributions: GoalContribution[]) {
  const current = contributions.filter((contribution) => contribution.goal_id === goal.id).reduce((sum, contribution) => sum + monetary(contribution.amount), 0);
  return { current, remaining: Math.max(0, goal.target_amount - current), percent: Math.max(0, Math.min(100, current / goal.target_amount * 100)) };
}

export function buildInsights(transactions: Transaction[], categories: Category[], start: string, end: string, smallPurchaseThreshold = 100) {
  const expenses = periodExpenses(transactions, start, end);
  if (!expenses.length) return [];
  const total = expenses.reduce((sum, transaction) => sum + monetary(transaction.amount), 0);
  const byCategory = groupedExpensesByCategory(expenses, categories);
  const paymentTotals = paymentMethodBreakdown(expenses);
  const small = expenses.filter((transaction) => monetary(transaction.amount) < smallPurchaseThreshold);
  const insights = [];
  if (byCategory[0]) insights.push(`${byCategory[0].name} was your largest spending category in this period.`);
  if (small.length) insights.push(`${small.length} purchase${small.length === 1 ? " was" : "s were"} below your small-purchase threshold.`);
  if (total > 0) insights.push(`${Math.round((paymentTotals.online / total) * 100)}% of your spending was paid through an explicitly online method.`);
  if (paymentTotals.unknown > 0) insights.push(`${formatMoney(paymentTotals.unknown)} of spending has no payment method recorded yet.`);
  insights.push(`Your average expense was ${formatMoney(total / expenses.length)}.`);
  return insights;
}

export interface CashFlowForecastDay {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  projectedSafeToSpend: number;
  recurringCount: number;
}

function nextRecurrence(date: Date, interval: Transaction["recurrence_interval"]) {
  if (interval === "weekly") return addDays(date, 7);
  if (interval === "yearly") return addYears(date, 1);
  return addMonths(date, 1);
}

export function cashFlowForecast(accounts: Account[], transactions: Transaction[], settings: UserSettings | null | undefined, horizonDays = 30, now = new Date()) {
  const start = parseISO(format(now, "yyyy-MM-dd"));
  const end = addDays(start, Math.max(0, horizonDays - 1));
  const metrics = summaryMetrics(accounts, transactions, settings, now);
  const daily = Array.from({ length: horizonDays }, (_, index) => {
    const date = addDays(start, index);
    return { date: format(date, "yyyy-MM-dd"), label: format(date, "MMM d"), income: 0, expense: 0, net: 0, projectedSafeToSpend: 0, recurringCount: 0 };
  });

  transactions.filter((transaction) => transaction.is_recurring && transaction.next_due_date && transaction.type !== "transfer").forEach((transaction) => {
    let due = parseISO(transaction.next_due_date as string);
    let attempts = 0;
    while (isBefore(due, start) && attempts < 730) { due = nextRecurrence(due, transaction.recurrence_interval); attempts += 1; }
    while (!isAfter(due, end) && attempts < 800) {
      const day = daily.find((entry) => entry.date === format(due, "yyyy-MM-dd"));
      if (day) {
        if (transaction.type === "income") day.income += monetary(transaction.amount);
        if (transaction.type === "expense") day.expense += monetary(transaction.amount);
        day.recurringCount += 1;
      }
      due = nextRecurrence(due, transaction.recurrence_interval);
      attempts += 1;
    }
  });

  let projected = metrics.safeToSpend;
  daily.forEach((day) => { day.net = day.income - day.expense; projected += day.net; day.projectedSafeToSpend = projected; });
  return { startingSafeToSpend: metrics.safeToSpend, endingSafeToSpend: projected, days: daily, recurringItems: daily.reduce((sum, day) => sum + day.recurringCount, 0) };
}

export interface FinancialPulse {
  currentSpending: number;
  previousSpending: number;
  spendingChange: number;
  spendingChangePercent: number | null;
  currentIncome: number;
  previousIncome: number;
  incomeChange: number;
  topCategory: { name: string; value: number } | null;
  emergingCategory: { name: string; increase: number } | null;
  reserveCoverageMonths: number | null;
}

export function financialPulse(accounts: Account[], transactions: Transaction[], categories: Category[], settings: UserSettings | null | undefined, now = new Date()): FinancialPulse {
  const currentRange = dateRangeForMonth(now);
  const previousRange = dateRangeForMonth(subMonths(now, 1));
  const current = transactions.filter((transaction) => transaction.transaction_date >= currentRange.start && transaction.transaction_date <= currentRange.end);
  const previous = transactions.filter((transaction) => transaction.transaction_date >= previousRange.start && transaction.transaction_date <= previousRange.end);
  const total = (items: Transaction[], type: Transaction["type"]) => items.filter((transaction) => transaction.type === type).reduce((sum, transaction) => sum + monetary(transaction.amount), 0);
  const currentSpending = total(current, "expense");
  const previousSpending = total(previous, "expense");
  const currentIncome = total(current, "income");
  const previousIncome = total(previous, "income");
  const currentCategories = groupedExpensesByCategory(current.filter((transaction) => transaction.type === "expense"), categories);
  const previousCategories = new Map(groupedExpensesByCategory(previous.filter((transaction) => transaction.type === "expense"), categories).map((category) => [category.name, category.value]));
  const emerging = currentCategories.map((category) => ({ name: category.name, increase: category.value - (previousCategories.get(category.name) ?? 0) })).filter((category) => category.increase > 0).sort((a, b) => b.increase - a.increase)[0] ?? null;
  const monthlyExpenseAverage = [0, 1, 2].map((offset) => periodExpenses(transactions, dateRangeForMonth(subMonths(now, offset)).start, dateRangeForMonth(subMonths(now, offset)).end).reduce((sum, transaction) => sum + monetary(transaction.amount), 0)).reduce((sum, value) => sum + value, 0) / 3;
  const reserveBalance = summaryMetrics(accounts, transactions, settings, now).savingsAndReserves;
  return {
    currentSpending,
    previousSpending,
    spendingChange: currentSpending - previousSpending,
    spendingChangePercent: previousSpending > 0 ? ((currentSpending - previousSpending) / previousSpending) * 100 : null,
    currentIncome,
    previousIncome,
    incomeChange: currentIncome - previousIncome,
    topCategory: currentCategories[0] ?? null,
    emergingCategory: emerging,
    reserveCoverageMonths: monthlyExpenseAverage > 0 ? reserveBalance / monthlyExpenseAverage : null,
  };
}

export interface TransactionReviewItem {
  transaction: Transaction;
  reasons: ("uncategorized" | "unusual")[];
  typicalAmount: number | null;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

export function transactionReviewQueue(transactions: Transaction[]) {
  const expenses = transactions.filter((transaction) => transaction.type === "expense");
  const valuesByCategory = new Map<string, number[]>();
  expenses.forEach((transaction) => {
    if (!transaction.category_id) return;
    const values = valuesByCategory.get(transaction.category_id) ?? [];
    values.push(monetary(transaction.amount));
    valuesByCategory.set(transaction.category_id, values);
  });
  return expenses.map((transaction): TransactionReviewItem | null => {
    const typicalAmount = transaction.category_id ? median(valuesByCategory.get(transaction.category_id) ?? []) : null;
    const unusual = Boolean(typicalAmount && (valuesByCategory.get(transaction.category_id as string)?.length ?? 0) >= 3 && monetary(transaction.amount) >= typicalAmount * 2 && !transaction.notes?.trim());
    const reasons = [!transaction.category_id ? "uncategorized" : null, unusual ? "unusual" : null].filter(Boolean) as TransactionReviewItem["reasons"];
    return reasons.length ? { transaction, reasons, typicalAmount } : null;
  }).filter((item): item is TransactionReviewItem => Boolean(item)).sort((a, b) => b.transaction.transaction_date.localeCompare(a.transaction.transaction_date));
}

export function filterByDateRange<T extends { transaction_date?: string; contribution_date?: string }>(records: T[], start: string, end: string) {
  return records.filter((record) => {
    const date = record.transaction_date ?? record.contribution_date;
    return Boolean(date && isWithinInterval(parseISO(date), { start: parseISO(start), end: parseISO(end) }));
  });
}
