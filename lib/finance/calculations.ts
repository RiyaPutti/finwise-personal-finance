import { addDays, addMonths, addYears, differenceInCalendarDays, endOfMonth, format, isAfter, isBefore, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import type { Account, AccountType, Budget, Category, GoalContribution, RecurringBill, SavingsGoal, Transaction, UserSettings } from "./types";
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

export interface EmergencyReserveCoverage {
  held: number;
  target: number;
  shortfall: number;
  percent: number;
  belowTarget: boolean;
}

export function emergencyReserveCoverage(accounts: Account[], transactions: Transaction[], settings?: UserSettings | null): EmergencyReserveCoverage {
  const balances = deriveAccountBalances(accounts, transactions);
  const held = accounts
    .filter((account) => !account.is_archived && account.type === "cash_reserve")
    .reduce((total, account) => total + (balances.get(account.id) ?? 0), 0);
  const target = Math.max(0, monetary(settings?.emergency_reserve));
  const shortfall = Math.max(0, target - held);
  return {
    held,
    target,
    shortfall,
    percent: target > 0 ? Math.min(100, Math.max(0, (held / target) * 100)) : 0,
    belowTarget: target > 0 && held < target,
  };
}

export function isSpendableAccount(type: AccountType) {
  return !["cash_reserve", "savings", "investment", "credit_card"].includes(type);
}

/** Bank and other non-cash accounts that can support UPI or online spending. */
export function isOnlineSpendableAccount(type: AccountType) {
  return isSpendableAccount(type) && type !== "cash";
}

export function summaryMetrics(accounts: Account[], transactions: Transaction[], settings?: UserSettings | null, now = new Date()) {
  const balances = deriveAccountBalances(accounts, transactions);
  const active = accounts.filter((account) => !account.is_archived);
  const balanceOf = (account: Account) => balances.get(account.id) ?? 0;
  const totalBalance = active.reduce((total, account) => total + balanceOf(account), 0);
  const savingsAndReserves = active.filter((account) => ["cash_reserve", "savings", "investment"].includes(account.type)).reduce((total, account) => total + balanceOf(account), 0);
  const onlineAvailable = active.filter((account) => isOnlineSpendableAccount(account.type)).reduce((total, account) => total + balanceOf(account), 0);
  const cashInHand = active.filter((account) => account.type === "cash").reduce((total, account) => total + balanceOf(account), 0);
  const available = onlineAvailable + cashInHand;
  const range = dateRangeForMonth(now);
  const inMonth = transactions.filter((transaction) => transaction.transaction_date >= range.start && transaction.transaction_date <= range.end);
  const income = inMonth.filter((transaction) => transaction.type === "income").reduce((total, transaction) => total + monetary(transaction.amount), 0);
  const spending = inMonth.filter((transaction) => transaction.type === "expense").reduce((total, transaction) => total + monetary(transaction.amount), 0);
  const reserve = monetary(settings?.emergency_reserve);
  const commitments = monetary(settings?.upcoming_commitments);
  const onlineSafeToSpend = Math.max(0, onlineAvailable - reserve - commitments);
  const totalSafeToSpend = Math.max(0, onlineSafeToSpend + cashInHand);
  return {
    totalBalance,
    savingsAndReserves,
    available,
    onlineAvailable,
    cashInHand,
    income,
    spending,
    monthlySavings: income - spending,
    onlineSafeToSpend,
    totalSafeToSpend,
    // Compatibility alias for existing consumers. It now explicitly represents the total, including Cash Wallet funds.
    safeToSpend: totalSafeToSpend,
    balances,
  };
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

/** Expense-only payment mix for the selected calendar month. Missing methods remain unclassified. */
export function monthlyPaymentSpendSplit(transactions: Transaction[], now = new Date()) {
  const { start, end } = dateRangeForMonth(now);
  return paymentMethodBreakdown(periodExpenses(transactions, start, end));
}

export interface OnlineSafeToSpendGuidance {
  kind: "empty" | "low";
  threshold: number;
  guardrails: number;
}

/**
 * A calm signal tied to the user's existing small-purchase threshold.
 * It is explanatory only and never moves money, changes records, or blocks spending.
 */
export function onlineSafeToSpendGuidance(
  onlineAvailable: number,
  onlineSafeToSpend: number,
  settings?: UserSettings | null,
): OnlineSafeToSpendGuidance | null {
  if (onlineAvailable <= 0) return null;
  const threshold = Math.max(0, monetary(settings?.small_purchase_threshold));
  const guardrails = Math.max(0, monetary(settings?.emergency_reserve)) + Math.max(0, monetary(settings?.upcoming_commitments));
  if (onlineSafeToSpend <= 0) return { kind: "empty", threshold, guardrails };
  if (threshold > 0 && onlineSafeToSpend <= threshold) return { kind: "low", threshold, guardrails };
  return null;
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

export interface MonthlyReserveTrendPoint {
  label: string;
  balance: number;
}

export function monthlyReserveTrend(accounts: Account[], transactions: Transaction[], months = 6, now = new Date()): MonthlyReserveTrendPoint[] {
  const reserveAccounts = accounts.filter((account) => !account.is_archived && account.type === "cash_reserve");
  return Array.from({ length: months }, (_, index) => {
    const month = subMonths(now, months - index - 1);
    const cutoff = format(endOfMonth(month), "yyyy-MM-dd");
    const balance = reserveAccounts.reduce((total, account) => {
      const openedOn = account.created_at.slice(0, 10);
      if (openedOn > cutoff) return total;
      const ledgerBalance = transactions
        .filter((transaction) => transaction.account_id === account.id && transaction.transaction_date <= cutoff)
        .reduce((value, transaction) => value + (transaction.type === "income" || transaction.transfer_direction === "in" ? monetary(transaction.amount) : -monetary(transaction.amount)), monetary(account.opening_balance));
      return total + ledgerBalance;
    }, 0);
    return { label: format(month, "MMM"), balance };
  });
}

export interface MonthlySpendableBalanceTrendPoint {
  label: string;
  online: number;
  cash: number;
}

/** Month-end balances for everyday online accounts and Cash Wallets only. Planning guardrails remain in the current safe-to-spend figures. */
export function monthlySpendableBalanceTrend(accounts: Account[], transactions: Transaction[], months = 6, now = new Date()): MonthlySpendableBalanceTrendPoint[] {
  const active = accounts.filter((account) => !account.is_archived);
  const balanceAt = (account: Account, cutoff: string) => {
    if (account.created_at.slice(0, 10) > cutoff) return 0;
    return transactions
      .filter((transaction) => transaction.account_id === account.id && transaction.transaction_date <= cutoff)
      .reduce((value, transaction) => value + (transaction.type === "income" || transaction.transfer_direction === "in" ? monetary(transaction.amount) : -monetary(transaction.amount)), monetary(account.opening_balance));
  };

  return Array.from({ length: months }, (_, index) => {
    const month = subMonths(now, months - index - 1);
    const cutoff = format(endOfMonth(month), "yyyy-MM-dd");
    return {
      label: format(month, "MMM"),
      online: active.filter((account) => isOnlineSpendableAccount(account.type)).reduce((total, account) => total + balanceAt(account, cutoff), 0),
      cash: active.filter((account) => account.type === "cash").reduce((total, account) => total + balanceAt(account, cutoff), 0),
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

export interface RecurringOccurrence {
  sourceTransactionId: string;
  accountId: string;
  categoryId: string | null;
  type: "income" | "expense";
  amount: number;
  description: string;
  dueDate: string;
  recurrenceInterval: NonNullable<Transaction["recurrence_interval"]>;
}

/** Returns only user-recorded recurring transaction occurrences; it never creates ledger rows. */
export function recurringOccurrences(transactions: Transaction[], start: string, end: string): RecurringOccurrence[] {
  const lower = parseISO(start);
  const upper = parseISO(end);
  return transactions
    .filter((transaction) => transaction.is_recurring && transaction.next_due_date && transaction.type !== "transfer" && transaction.recurrence_interval)
    .flatMap((transaction) => {
      const recurrenceInterval = transaction.recurrence_interval;
      const nextDueDate = transaction.next_due_date;
      if (transaction.type === "transfer" || !recurrenceInterval || !nextDueDate) return [];
      let due = parseISO(nextDueDate);
      let attempts = 0;
      while (isBefore(due, lower) && attempts < 730) { due = nextRecurrence(due, recurrenceInterval); attempts += 1; }
      const occurrences: RecurringOccurrence[] = [];
      while (!isAfter(due, upper) && attempts < 800) {
        occurrences.push({ sourceTransactionId: transaction.id, accountId: transaction.account_id, categoryId: transaction.category_id, type: transaction.type, amount: monetary(transaction.amount), description: transaction.description, dueDate: format(due, "yyyy-MM-dd"), recurrenceInterval });
        due = nextRecurrence(due, recurrenceInterval);
        attempts += 1;
      }
      return occurrences;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.description.localeCompare(b.description));
}

/** Returns planning-only occurrences from explicit bill plans; it never creates ledger rows. */
export function recurringBillOccurrences(bills: RecurringBill[], start: string, end: string): RecurringOccurrence[] {
  const lower = parseISO(start);
  const upper = parseISO(end);
  return bills
    .filter((bill) => bill.is_active)
    .flatMap((bill) => {
      let due = parseISO(bill.next_due_date);
      let attempts = 0;
      while (isBefore(due, lower) && attempts < 730) { due = nextRecurrence(due, bill.cadence); attempts += 1; }
      const occurrences: RecurringOccurrence[] = [];
      while (!isAfter(due, upper) && attempts < 800) {
        occurrences.push({ sourceTransactionId: `bill:${bill.id}`, accountId: bill.account_id, categoryId: bill.category_id, type: "expense", amount: monetary(bill.amount), description: bill.name, dueDate: format(due, "yyyy-MM-dd"), recurrenceInterval: bill.cadence });
        due = nextRecurrence(due, bill.cadence);
        attempts += 1;
      }
      return occurrences;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.description.localeCompare(b.description));
}

export function billRunway(transactions: Transaction[], horizonDays = 30, now = new Date(), recurringBills: RecurringBill[] = []) {
  const start = format(now, "yyyy-MM-dd");
  const end = format(addDays(parseISO(start), Math.max(0, horizonDays - 1)), "yyyy-MM-dd");
  const items = [...recurringOccurrences(transactions, start, end), ...recurringBillOccurrences(recurringBills, start, end)].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.description.localeCompare(b.description));
  const bills = items.filter((item) => item.type === "expense");
  const income = items.filter((item) => item.type === "income");
  return {
    start,
    end,
    items,
    bills,
    income,
    billTotal: bills.reduce((total, item) => total + item.amount, 0),
    incomeTotal: income.reduce((total, item) => total + item.amount, 0),
  };
}

export function cashFlowForecast(accounts: Account[], transactions: Transaction[], settings: UserSettings | null | undefined, horizonDays = 30, now = new Date(), recurringBills: RecurringBill[] = []) {
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
  recurringBillOccurrences(recurringBills, format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")).forEach((bill) => {
    const day = daily.find((entry) => entry.date === bill.dueDate);
    if (!day) return;
    day.expense += bill.amount;
    day.recurringCount += 1;
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

export function netWorthTrend(accounts: Account[], transactions: Transaction[], months = 12, now = new Date()) {
  const active = accounts.filter((account) => !account.is_archived);
  return Array.from({ length: months }, (_, index) => {
    const month = subMonths(now, months - index - 1);
    const cutoff = format(endOfMonth(month), "yyyy-MM-dd");
    const balances = new Map(active.map((account) => [account.id, account.created_at.slice(0, 10) > cutoff ? 0 : monetary(account.opening_balance)]));
    transactions.filter((transaction) => transaction.transaction_date <= cutoff).forEach((transaction) => {
      if (!balances.has(transaction.account_id)) return;
      const delta = transaction.type === "income" || transaction.transfer_direction === "in" ? monetary(transaction.amount) : -monetary(transaction.amount);
      balances.set(transaction.account_id, (balances.get(transaction.account_id) ?? 0) + delta);
    });
    const values = active.map((account) => ({ account, balance: balances.get(account.id) ?? 0 }));
    const assets = values.filter(({ account }) => account.type !== "credit_card").reduce((total, item) => total + item.balance, 0);
    const liabilities = values.filter(({ account }) => account.type === "credit_card").reduce((total, item) => total + Math.abs(Math.min(0, item.balance)), 0);
    return { label: format(month, "MMM"), assets, liabilities, netWorth: assets - liabilities };
  });
}

export interface DebtPayoffPathItem {
  accountId: string;
  accountName: string;
  balance: number;
  recordedRepaymentsThisMonth: number;
}

export function debtPayoffPath(accounts: Account[], transactions: Transaction[], now = new Date()): DebtPayoffPathItem[] {
  const balances = deriveAccountBalances(accounts, transactions);
  const month = dateRangeForMonth(now);
  return accounts
    .filter((account) => !account.is_archived && account.type === "credit_card")
    .map((account) => ({
      accountId: account.id,
      accountName: account.name,
      balance: Math.abs(Math.min(0, balances.get(account.id) ?? 0)),
      recordedRepaymentsThisMonth: transactions
        .filter((transaction) => transaction.account_id === account.id && transaction.transfer_direction === "in" && transaction.transaction_date >= month.start && transaction.transaction_date <= month.end)
        .reduce((total, transaction) => total + monetary(transaction.amount), 0),
    }))
    .filter((item) => item.balance > 0 || item.recordedRepaymentsThisMonth > 0)
    .sort((left, right) => right.balance - left.balance);
}

export function moneyMap(transactions: Transaction[], categories: Category[], now = new Date()) {
  const range = dateRangeForMonth(now);
  const scoped = transactions.filter((transaction) => transaction.transaction_date >= range.start && transaction.transaction_date <= range.end);
  const income = scoped.filter((transaction) => transaction.type === "income").reduce((total, item) => total + monetary(item.amount), 0);
  const expenses = scoped.filter((transaction) => transaction.type === "expense").reduce((total, item) => total + monetary(item.amount), 0);
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const essential = scoped.filter((transaction) => transaction.type === "expense" && transaction.need_want === "need").reduce((total, item) => total + monetary(item.amount), 0);
  const flexible = expenses - essential;
  const top = groupedExpensesByCategory(scoped.filter((item) => item.type === "expense"), categories).slice(0, 3);
  return { income, expenses, essential, flexible, net: income - expenses, top, categoryMap };
}

export function spendingRhythm(transactions: Transaction[], now = new Date()) {
  const start = format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd");
  const byWeek = [0, 0, 0, 0, 0];
  transactions.filter((transaction) => transaction.type === "expense" && transaction.transaction_date >= start).forEach((transaction) => {
    const day = parseISO(transaction.transaction_date).getDate();
    const week = Math.min(4, Math.floor((day - 1) / 7));
    byWeek[week] += monetary(transaction.amount);
  });
  const labels = ["Days 1–7", "Days 8–14", "Days 15–21", "Days 22–28", "Month end"];
  return labels.map((label, index) => ({ label, value: byWeek[index] / 3 }));
}

export function annualExpenseRhythm(transactions: Transaction[], now = new Date()) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = subMonths(now, 11 - index);
    const range = dateRangeForMonth(month);
    const expense = periodExpenses(transactions, range.start, range.end).reduce((total, item) => total + monetary(item.amount), 0);
    return { label: format(month, "MMM"), expense };
  });
}

export function leakSignals(transactions: Transaction[], now = new Date()) {
  const cutoff = format(subMonths(now, 3), "yyyy-MM-dd");
  const grouped = new Map<string, Transaction[]>();
  transactions.filter((transaction) => transaction.type === "expense" && transaction.transaction_date >= cutoff && transaction.description.trim()).forEach((transaction) => {
    const key = transaction.description.trim().toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), transaction]);
  });
  return [...grouped.entries()].map(([description, records]) => ({ description, records, total: records.reduce((sum, record) => sum + monetary(record.amount), 0), average: records.reduce((sum, record) => sum + monetary(record.amount), 0) / records.length })).filter((signal) => signal.records.length >= 3).sort((a, b) => b.total - a.total).slice(0, 4);
}

export function monthlyReview(transactions: Transaction[], categories: Category[], now = new Date()) {
  const pulse = financialPulse([], transactions, categories, null, now);
  const map = moneyMap(transactions, categories, now);
  const direction = pulse.spendingChange > 0 ? "higher" : pulse.spendingChange < 0 ? "lower" : "steady";
  return { ...pulse, ...map, direction, savingsRate: pulse.currentIncome > 0 ? Math.max(-100, ((pulse.currentIncome - pulse.currentSpending) / pulse.currentIncome) * 100) : null };
}

export function financialWeather(accounts: Account[], transactions: Transaction[], settings: UserSettings | null | undefined, now = new Date()) {
  const metrics = summaryMetrics(accounts, transactions, settings, now);
  const runway = billRunway(transactions, 30, now);
  const reserve = emergencyReserveCoverage(accounts, transactions, settings);
  const afterBills = metrics.safeToSpend + runway.incomeTotal - runway.billTotal;
  if (afterBills < 0 || metrics.safeToSpend <= 0) return { state: "tight" as const, label: "Tight", message: "Upcoming recorded bills leave little flexible room. Keep optional spending deliberate." };
  if (reserve.belowTarget || afterBills < metrics.safeToSpend * 0.4) return { state: "watchful" as const, label: "Watchful", message: "Your plan is workable, but reserve coverage or near-term bills deserve attention." };
  return { state: "clear" as const, label: "Clear", message: "Your current ledger, reserve guardrail, and recorded bill runway are in a calm position." };
}

export function decisionSimulator(amount: number, accounts: Account[], transactions: Transaction[], settings: UserSettings | null | undefined, now = new Date()) {
  const cost = Math.max(0, monetary(amount));
  const metrics = summaryMetrics(accounts, transactions, settings, now);
  const runway = billRunway(transactions, 30, now);
  const afterPurchase = metrics.safeToSpend - cost;
  const afterBills = afterPurchase + runway.incomeTotal - runway.billTotal;
  const state = afterPurchase < 0 ? "pause" : afterBills < 0 ? "watch" : "comfortable";
  return { cost, safeToSpend: metrics.safeToSpend, afterPurchase, afterBills, state, upcomingBills: runway.billTotal, expectedIncome: runway.incomeTotal };
}

export function quietWins(accounts: Account[], transactions: Transaction[], categories: Category[], settings: UserSettings | null | undefined, now = new Date()) {
  const pulse = financialPulse(accounts, transactions, categories, settings, now);
  const reserve = emergencyReserveCoverage(accounts, transactions, settings);
  const wins: string[] = [];
  if (pulse.spendingChange < 0) wins.push(`Spending is ${formatMoney(Math.abs(pulse.spendingChange))} lower than last month so far.`);
  if (reserve.target > 0 && !reserve.belowTarget) wins.push("Your Cash reserve has reached its chosen target.");
  if (pulse.currentIncome > pulse.currentSpending && pulse.currentIncome > 0) wins.push("This month’s recorded income is currently ahead of recorded spending.");
  return wins;
}
