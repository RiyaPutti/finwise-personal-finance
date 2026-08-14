"use client";

import { useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { Card, EmptyState, Segmented } from "@/components/ui/primitives";
import { useFinance } from "./finance-provider";
import { buildInsights, dateRangeForMonth, formatMoney, groupedExpensesByCategory, monthlyTrend, monetary, paymentMethodBreakdown, periodExpenses } from "@/lib/finance/calculations";
import { classifyPaymentMethod } from "@/lib/finance/payment-methods";
import { CategoryBars, SplitDonut, TrendChart } from "./charts";

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[var(--raised)] p-3"><p className="text-[11px] text-[var(--muted)]">{label}</p><p className="mt-1 font-mono text-base font-medium tabular-nums">{value}</p></div>;
}

const currentRange = () => ({ start: format(startOfMonth(new Date()), "yyyy-MM-dd"), end: format(endOfMonth(new Date()), "yyyy-MM-dd") });

export function SpendAnalysisScreen() {
  const { transactions, categories, settings } = useFinance();
  const [paymentView, setPaymentView] = useState<"all" | "online" | "cash">("all");
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year" | "all" | "custom">("month");
  const [range, setRange] = useState(currentRange());
  const computedRange = useMemo(() => {
    if (period === "today") return { start: format(new Date(), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") };
    if (period === "week") return { start: format(new Date(Date.now() - 6 * 86400000), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") };
    if (period === "year") return { start: format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") };
    if (period === "all") return { start: "1900-01-01", end: "2999-12-31" };
    return period === "custom" ? range : currentRange();
  }, [period, range]);
  const base = periodExpenses(transactions, computedRange.start, computedRange.end);
  const expenses = base.filter((transaction) => paymentView === "all" || classifyPaymentMethod(transaction.payment_method) === paymentView);
  const total = expenses.reduce((sum, item) => sum + monetary(item.amount), 0);
  const categoryData = groupedExpensesByCategory(expenses, categories);
  const paymentTotals = paymentMethodBreakdown(base);
  const largest = expenses.reduce((largest, item) => monetary(item.amount) > monetary(largest?.amount) ? item : largest, expenses[0]);
  const insights = buildInsights(transactions, categories, computedRange.start, computedRange.end, settings?.small_purchase_threshold);
  const currency = settings?.currency ?? "USD";

  return <div className="grid gap-7">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-medium uppercase tracking-[.18em] text-lime-300">Spend analysis</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Understand what leaves your accounts.</h1><p className="mt-2 text-sm text-[var(--muted)]">Transfers are deliberately excluded from every spending number.</p></div>
      <div className="flex flex-wrap items-center gap-3"><Segmented value={paymentView} onChange={(value) => setPaymentView(value as typeof paymentView)} options={[{ value: "all", label: "All" }, { value: "online", label: "Online" }, { value: "cash", label: "Cash" }]} /><Segmented value={period} onChange={(value) => setPeriod(value as typeof period)} options={[{ value: "today", label: "Today" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "year", label: "Year" }, { value: "all", label: "All time" }, { value: "custom", label: "Custom" }]} /></div>
    </div>
    {period === "custom" && <Card className="flex flex-wrap items-center gap-3 p-3"><CalendarRange size={16} className="text-[var(--muted)]" /><input className="bg-transparent text-sm outline-none" type="date" value={range.start} onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))} /><span className="text-[var(--muted)]">to</span><input className="bg-transparent text-sm outline-none" type="date" value={range.end} onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))} /></Card>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Stat label="Total spending" value={formatMoney(total, currency)} /><Stat label="Average spending" value={formatMoney(expenses.length ? total / expenses.length : 0, currency)} /><Stat label="Largest expense" value={largest ? formatMoney(largest.amount, currency) : "—"} /><Stat label="Transactions" value={String(expenses.length)} /><Stat label="Top category" value={categoryData[0]?.name ?? "—"} /><Stat label="Small purchases" value={String(expenses.filter((item) => monetary(item.amount) < (settings?.small_purchase_threshold ?? 100)).length)} /></div>
    {!expenses.length ? <Card><EmptyState title="No spending in this period" description="When you record expenses, this view will show patterns without inventing any data." /></Card> : <>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-semibold">Spending by category</h2><p className="mt-1 text-xs text-[var(--muted)]">Which categories account for the most?</p><div className="mt-5"><CategoryBars data={categoryData} currency={currency} /></div></Card>
        <Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-semibold">Cash versus online</h2><p className="mt-1 text-xs text-[var(--muted)]">Unknown methods are kept separate and are not counted as online.</p><SplitDonut data={[{ name: "Cash", value: paymentTotals.cash }, { name: "Online", value: paymentTotals.online }]} currency={currency} /><div className="grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded-xl bg-[var(--raised)] p-2"><p className="text-[var(--muted)]">Cash</p><p className="mt-1 font-mono text-[var(--ink)]">{formatMoney(paymentTotals.cash, currency)}</p></div><div className="rounded-xl bg-[var(--raised)] p-2"><p className="text-[var(--muted)]">Online</p><p className="mt-1 font-mono text-[var(--ink)]">{formatMoney(paymentTotals.online, currency)}</p></div><div className="rounded-xl bg-[var(--raised)] p-2"><p className="text-[var(--muted)]">Unknown</p><p className="mt-1 font-mono text-[var(--ink)]">{formatMoney(paymentTotals.unknown, currency)}</p></div></div></Card>
      </div>
      <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><Lightbulb size={17} className="text-lime-300" /><h2 className="font-display text-lg font-semibold">What the numbers say</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{insights.map((insight) => <div key={insight} className="rounded-xl border border-[var(--line)] bg-[var(--raised)]/45 p-3 text-sm leading-6 text-[var(--muted)]">{insight}</div>)}</div></Card>
    </>}
  </div>;
}

export function ReportsScreen() {
  const { transactions, categories, settings } = useFinance();
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const [cursor, setCursor] = useState(new Date());
  const range = view === "monthly" ? dateRangeForMonth(cursor) : { start: format(new Date(cursor.getFullYear(), 0, 1), "yyyy-MM-dd"), end: format(new Date(cursor.getFullYear(), 11, 31), "yyyy-MM-dd") };
  const scoped = transactions.filter((item) => item.transaction_date >= range.start && item.transaction_date <= range.end);
  const expenses = scoped.filter((item) => item.type === "expense"); const income = scoped.filter((item) => item.type === "income");
  const expenseTotal = expenses.reduce((sum, item) => sum + monetary(item.amount), 0); const incomeTotal = income.reduce((sum, item) => sum + monetary(item.amount), 0);
  const transfers = scoped.filter((item) => item.type === "transfer").reduce((sum, item) => sum + monetary(item.amount), 0) / 2;
  const currency = settings?.currency ?? "USD"; const title = view === "monthly" ? format(cursor, "MMMM yyyy") : format(cursor, "yyyy");
  return <div className="grid gap-7"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-medium uppercase tracking-[.18em] text-lime-300">Reports</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">A long view, grounded in your ledger.</h1><p className="mt-2 text-sm text-[var(--muted)]">Months and years with no data remain valid, rather than being disguised with demo values.</p></div><div className="flex items-center gap-3"><Segmented value={view} onChange={(value) => setView(value as typeof view)} options={[{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }]} /><div className="flex items-center rounded-xl bg-[var(--raised)] p-1"><button aria-label="Previous period" onClick={() => setCursor(view === "monthly" ? subMonths(cursor, 1) : new Date(cursor.getFullYear() - 1, 0, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--panel)]"><ChevronLeft size={16} /></button><span className="min-w-28 px-2 text-center text-sm font-medium">{title}</span><button aria-label="Next period" onClick={() => setCursor(view === "monthly" ? subMonths(cursor, -1) : new Date(cursor.getFullYear() + 1, 0, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--panel)]"><ChevronRight size={16} /></button></div></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Stat label="Opening view" value={range.start} /><Stat label="Total income" value={formatMoney(incomeTotal, currency)} /><Stat label="Total expenses" value={formatMoney(expenseTotal, currency)} /><Stat label="Transfers" value={formatMoney(transfers, currency)} /><Stat label="Net movement" value={formatMoney(incomeTotal - expenseTotal, currency)} /></div>{!scoped.length ? <Card><EmptyState title={`No activity in ${title}`} description="This period is ready when you are. It remains part of your financial history even with no entries." /></Card> : <div className="grid gap-5 xl:grid-cols-2"><Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-semibold">Income versus spending</h2><p className="mt-1 text-xs text-[var(--muted)]">A six-month rolling comparison</p><div className="mt-5"><TrendChart data={monthlyTrend(transactions, 6, cursor)} currency={currency} /></div></Card><Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-semibold">Most-used categories</h2><p className="mt-1 text-xs text-[var(--muted)]">Expense breakdown for this period</p><div className="mt-5"><CategoryBars data={groupedExpensesByCategory(expenses, categories)} currency={currency} /></div></Card></div>}</div>;
}
