"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CalendarClock, CircleAlert, CircleCheck, Landmark, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { CashFlowForecastChart } from "./charts";
import { useFinance } from "./finance-provider";
import { cashFlowForecast, financialPulse, formatMoney } from "@/lib/finance/calculations";

function changeLabel(value: number, percent: number | null, currency: string) {
  if (percent === null) return value > 0 ? `${formatMoney(value, currency)} recorded this month` : "No comparison available yet";
  const direction = value > 0 ? "higher" : value < 0 ? "lower" : "unchanged";
  return `${Math.abs(percent).toFixed(0)}% ${direction} than last month`;
}

export function MoneyPulseScreen() {
  const { accounts, categories, transactions, settings, loading } = useFinance();
  const currency = settings?.currency ?? "INR";
  const forecast = cashFlowForecast(accounts, transactions, settings);
  const pulse = financialPulse(accounts, transactions, categories, settings);
  const hasAccounts = accounts.some((account) => !account.is_archived);

  if (loading) return <div className="grid gap-5"><div className="h-8 w-48 animate-pulse rounded bg-[var(--raised)]" /><div className="h-80 animate-pulse rounded-2xl bg-[var(--raised)]" /></div>;
  if (!hasAccounts) return <Card><EmptyState title="Your money pulse starts with an account" description="Create an account, then record transactions to see a cash-flow forecast and personal financial signals." action={<Link href="/app/accounts"><Button>Add an account</Button></Link>} /></Card>;

  const pulseNarrative = pulse.spendingChange > 0
    ? `Spending is ${changeLabel(pulse.spendingChange, pulse.spendingChangePercent, currency)}. Review the movement before it becomes a pattern.`
    : pulse.spendingChange < 0
      ? `Spending is ${changeLabel(pulse.spendingChange, pulse.spendingChangePercent, currency)}. Your ledger is moving in a calmer direction.`
      : "Your month-to-date spending is steady against last month.";

  return <div className="grid gap-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-medium uppercase tracking-[.18em] text-[var(--accent)]">Money pulse</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Know what is coming, not just what happened.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">A ledger-derived forecast and a calm monthly readout. Nothing here changes your balances or records transactions for you.</p></div>
      <Link href="/app/review"><Button variant="quiet"><CircleCheck size={16} />Review transactions</Button></Link>
    </div>

    <Card className="overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><CalendarClock size={17} className="text-[var(--accent)]" /><h2 className="font-display text-lg font-semibold">30-day cash flow</h2></div><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">Projected safe-to-spend balance from your current spendable accounts, reserve guardrails, commitments, and recorded recurring entries.</p></div><span className="w-fit rounded-full border border-[var(--line)] bg-[var(--raised)] px-3 py-1 text-xs font-medium text-[var(--muted)]">{forecast.recurringItems} scheduled item{forecast.recurringItems === 1 ? "" : "s"}</span></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[var(--raised)] p-4"><p className="text-xs text-[var(--muted)]">Starting safe to spend</p><p className="mt-2 font-mono text-xl font-medium tabular-nums">{formatMoney(forecast.startingSafeToSpend, currency)}</p></div><div className="rounded-2xl bg-[var(--raised)] p-4"><p className="text-xs text-[var(--muted)]">Projected in 30 days</p><p className={`mt-2 font-mono text-xl font-medium tabular-nums ${forecast.endingSafeToSpend < 0 ? "text-[var(--danger)]" : "text-[var(--positive)]"}`}>{formatMoney(forecast.endingSafeToSpend, currency)}</p></div></div>
      <div className="mt-5"><CashFlowForecastChart data={forecast.days} currency={currency} /></div>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Forecasts include only transactions marked recurring with a next due date. Add or edit those entries as plans change.</p>
    </Card>

    <section><div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2"><Sparkles size={17} className="text-[var(--accent)]" /><h2 className="font-display text-xl font-semibold">Financial pulse</h2></div><p className="mt-2 text-sm text-[var(--muted)]">A short read of this month against the one before it.</p></div><Link href="/app/spend" className="text-sm font-medium text-[var(--accent)] hover:underline">Open spend analysis</Link></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><div className="flex items-start justify-between"><p className="text-xs font-medium text-[var(--muted)]">Month-to-date spending</p><div className={`grid h-9 w-9 place-items-center rounded-xl ${pulse.spendingChange > 0 ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--positive-soft)] text-[var(--positive)]"}`}>{pulse.spendingChange > 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}</div></div><p className="mt-5 font-mono text-2xl font-medium tabular-nums">{formatMoney(pulse.currentSpending, currency)}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{changeLabel(pulse.spendingChange, pulse.spendingChangePercent, currency)}</p></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><p className="text-xs font-medium text-[var(--muted)]">Leading category</p><div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><WalletCards size={17} /></div></div><p className="mt-5 font-display text-xl font-semibold">{pulse.topCategory?.name ?? "No expenses yet"}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{pulse.topCategory ? `${formatMoney(pulse.topCategory.value, currency)} recorded in this category` : "Add categorized expenses for a clearer picture."}</p></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><p className="text-xs font-medium text-[var(--muted)]">Reserve coverage</p><div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--positive-soft)] text-[var(--positive)]"><Landmark size={17} /></div></div><p className="mt-5 font-mono text-2xl font-medium tabular-nums">{pulse.reserveCoverageMonths === null ? "—" : `${pulse.reserveCoverageMonths.toFixed(1)} mo`}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Based on savings and reserves against your recent three-month expense average.</p></Card>
      </div>
      <Card className="mt-4 p-5"><div className="flex gap-3"><div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${pulse.spendingChange > 0 ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--positive-soft)] text-[var(--positive)]"}`}><CircleAlert size={16} /></div><div><p className="font-medium">What deserves your attention</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{pulseNarrative}{pulse.emergingCategory ? ` ${pulse.emergingCategory.name} has increased by ${formatMoney(pulse.emergingCategory.increase, currency)} compared with last month.` : ""}</p></div></div></Card>
    </section>
  </div>;
}
