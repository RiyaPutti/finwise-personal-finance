import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
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

export function filterByDateRange<T extends { transaction_date?: string; contribution_date?: string }>(records: T[], start: string, end: string) {
  return records.filter((record) => {
    const date = record.transaction_date ?? record.contribution_date;
    return Boolean(date && isWithinInterval(parseISO(date), { start: parseISO(start), end: parseISO(end) }));
  });
}
