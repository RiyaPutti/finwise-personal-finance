"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CircleHelp, Landmark, PiggyBank, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useFinance } from "./finance-provider";
import { emergencyReserveCoverage, formatMoney, isEndOfMonthReviewWindow, monthlyReserveTrend, monthlyTrend, onlineSafeToSpendGuidance, summaryMetrics } from "@/lib/finance/calculations";
import { isEligibleEverydayAccount, readPreferredEverydayAccountId, writePreferredEverydayAccountId } from "@/lib/finance/everyday-account";
import { ReserveProgressChart, TrendChart } from "./charts";
import { TransactionList } from "./transaction-list";

function Metric({
  label,
  value,
  helper,
  tone = "neutral",
  icon: Icon,
  tooltip,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "positive" | "warm";
  icon: React.ComponentType<{ size?: number }>;
  tooltip?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
          {tooltip ? (
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label={`Explain ${label}`}
                className="rounded text-[var(--muted)] outline-none transition hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              >
                <CircleHelp size={14} />
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-64 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left text-xs font-normal leading-5 text-[var(--ink)] shadow-xl group-hover:block group-focus-within:block"
              >
                {tooltip}
              </span>
            </span>
          ) : null}
        </div>
        <div
          className={`grid h-8 w-8 place-items-center rounded-xl ${
            tone === "positive"
              ? "bg-[var(--positive-soft)] text-[var(--positive)]"
              : tone === "warm"
                ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                : "bg-[var(--raised)] text-[var(--muted)]"
          }`}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-5 font-mono text-2xl font-medium tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{helper}</p>
    </Card>
  );
}

export function OverviewScreen() {
  const { accounts, profile, transactions, settings, loading } = useFinance();
  const [preferredEverydayAccountId, setPreferredEverydayAccountId] = useState("");
  const [monthEndReviewDismissed, setMonthEndReviewDismissed] = useState(true);
  const metrics = summaryMetrics(accounts, transactions, settings);
  const onlineGuidance = onlineSafeToSpendGuidance(metrics.onlineAvailable, metrics.onlineSafeToSpend, settings);
  const reserveCoverage = emergencyReserveCoverage(accounts, transactions, settings);
  const reserveTrend = monthlyReserveTrend(accounts, transactions);
  const hasReserveAccount = accounts.some((account) => !account.is_archived && account.type === "cash_reserve");
  const everydayAccounts = accounts.filter(isEligibleEverydayAccount);
  const preferredEverydayAccount = everydayAccounts.find((account) => account.id === preferredEverydayAccountId) ?? null;
  const currency = settings?.currency ?? "USD";
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || null;
  const onlineSafeToSpendFormula =
    "UPI / online Safe to Spend = max(0, active Bank and Other account balances − Emergency reserve − Upcoming commitments). Cash Wallet, Cash Reserve, Savings, Investments, and Credit cards are excluded.";
  const totalSafeToSpendFormula =
    "Total Safe to Spend = UPI / online Safe to Spend + active Cash Wallet balances. Cash Reserve, Savings, Investments, and Credit cards remain excluded.";

  useEffect(() => {
    const sync = () => setPreferredEverydayAccountId(readPreferredEverydayAccountId());
    sync();
    window.addEventListener("finwise:preferred-everyday-account-change", sync);
    return () => window.removeEventListener("finwise:preferred-everyday-account-change", sync);
  }, []);

  useEffect(() => {
    const key = `finwise:month-end-review:${new Date().toISOString().slice(0, 7)}`;
    setMonthEndReviewDismissed(window.localStorage.getItem(key) === "dismissed");
  }, []);

  const dismissMonthEndReview = () => {
    const key = `finwise:month-end-review:${new Date().toISOString().slice(0, 7)}`;
    window.localStorage.setItem(key, "dismissed");
    setMonthEndReviewDismissed(true);
  };

  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="h-8 w-44 animate-pulse rounded bg-[var(--raised)]" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl bg-[var(--raised)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.18em] text-lime-300">Overview</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{firstName ? `Welcome back, ${firstName}.` : "A clearer view of today."}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{firstName ? "Here is a clear view of your money today." : "Balances and analytics stay tied to your actual ledger."}</p>
        </div>
        <Link href="/app/reports"><Button variant="quiet">View reports</Button></Link>
      </div>

      {reserveCoverage.belowTarget ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center" style={{ borderColor: "#B8965A66", backgroundColor: "#B8965A18" }}>
          <AlertTriangle size={19} className="mt-0.5 shrink-0 text-[#D8C38E] sm:mt-0" />
          <div>
            <p className="text-sm font-semibold">Emergency reserve is below your target</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{formatMoney(reserveCoverage.held, currency)} is held in active Cash reserve accounts against a {formatMoney(reserveCoverage.target, currency)} target. You are {formatMoney(reserveCoverage.shortfall, currency)} short. This is an in-app signal only; it does not move money or create a transfer.</p>
          </div>
          <Link className="shrink-0 text-sm font-semibold text-[var(--gold)] transition hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]" href="/app/settings">Edit target</Link>
        </div>
      ) : reserveCoverage.target > 0 && hasReserveAccount ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-[var(--positive)]/30 bg-[var(--positive-soft)] p-4 sm:flex-row sm:items-center">
          <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[var(--positive)] sm:mt-0" />
          <div>
            <p className="text-sm font-semibold">Emergency reserve target covered</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{formatMoney(reserveCoverage.held, currency)} is held in active Cash reserve accounts, meeting your {formatMoney(reserveCoverage.target, currency)} target. Your target remains a planning guardrail and does not move money.</p>
          </div>
          <Link className="shrink-0 text-sm font-semibold text-[var(--positive)] transition hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--positive)]" href="/app/settings">Edit target</Link>
        </div>
      ) : null}

      {onlineGuidance ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-[var(--gold)]/35 bg-[var(--gold)]/10 p-4 sm:flex-row sm:items-center">
          <Smartphone size={19} className="mt-0.5 shrink-0 text-[var(--gold)] sm:mt-0" />
          <div>
            <p className="text-sm font-semibold">{onlineGuidance.kind === "empty" ? "UPI / online Safe to Spend is currently zero" : "UPI / online Safe to Spend is low"}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{onlineGuidance.kind === "empty" ? "Your current reserve and commitment guardrails leave no UPI / online spendable amount today." : `Your UPI / online Safe to Spend is at or below your ${formatMoney(onlineGuidance.threshold, currency)} small-purchase threshold.`} {metrics.cashInHand > 0 ? `${formatMoney(metrics.cashInHand, currency)} of physical cash stays separate in Total Safe to Spend.` : "This is a planning signal only; it does not move money or block a transaction."}</p>
          </div>
        </div>
      ) : null}

      {!accounts.length ? (
        <Card>
          <EmptyState
            title="Start with an account"
            description="Create the place where your money lives, then record opening balances and transactions."
            action={<Link href="/app/accounts"><Button>Add your first account</Button></Link>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <Metric label="Total balance" value={formatMoney(metrics.totalBalance, currency)} helper="Across all active accounts" icon={Landmark} />
            <Metric
              label="UPI / online safe"
              value={formatMoney(metrics.onlineSafeToSpend, currency)}
              helper="After reserve and commitments"
              tone="positive"
              icon={Smartphone}
              tooltip={onlineSafeToSpendFormula}
            />
            <Metric label="Total safe to spend" value={formatMoney(metrics.totalSafeToSpend, currency)} helper="UPI / online plus cash" tone="positive" icon={ShieldCheck} tooltip={totalSafeToSpendFormula} />
            <Metric label="This month in" value={formatMoney(metrics.income, currency)} helper="Income recorded this month" tone="positive" icon={ArrowDownRight} />
            <Metric label="This month out" value={formatMoney(metrics.spending, currency)} helper="Actual expenses only" tone="warm" icon={ArrowUpRight} />
          </div>

          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">This month’s spending</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Explore the same ledger expenses by payment method in Spend Analysis.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/app/spend?period=month&payment=all"><Button variant="quiet" size="sm">All expenses</Button></Link>
              <Link href="/app/spend?period=month&payment=online"><Button variant="quiet" size="sm">UPI / online</Button></Link>
              <Link href="/app/spend?period=month&payment=cash"><Button variant="quiet" size="sm">Cash</Button></Link>
            </div>
          </Card>

          {isEndOfMonthReviewWindow() && !monthEndReviewDismissed ? (
            <Card className="flex flex-col gap-3 border-[var(--gold)]/30 bg-[var(--gold)]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Month-end review is ready</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Take a short, ledger-based look at this month before the next one begins. It does not change any money or settings.</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={dismissMonthEndReview} className="text-xs font-medium text-[var(--muted)] transition hover:text-[var(--ink)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]">Not now</button>
                <Link href="/app/discover"><Button size="sm">Open review</Button></Link>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
            <Card className="p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">Income and spending</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">Last six months</p>
                </div>
                <div className="flex gap-3 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--positive)]" />Income</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--danger)]" />Expenses</span>
                </div>
              </div>
              <TrendChart data={monthlyTrend(transactions)} currency={currency} />
            </Card>

            <div className="grid gap-5">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Savings & reserves</p>
                    <p className="mt-2 font-mono text-2xl font-medium tabular-nums">{formatMoney(metrics.savingsAndReserves, currency)}</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--positive-soft)] text-[var(--positive)]"><PiggyBank size={19} /></div>
                </div>
                <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Dedicated savings, investments, and cash reserves are kept outside normal spending money.</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Cash in hand</p>
                    <p className="mt-2 font-mono text-2xl font-medium tabular-nums">{formatMoney(metrics.cashInHand, currency)}</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-300/10 text-blue-300"><Wallet size={19} /></div>
                </div>
                <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Physical cash stays separate from UPI / online spending and is added only to Total Safe to Spend.</p>
              </Card>
            </div>
          </div>

          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Emergency reserve progress</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">Month-end balance from active Cash reserve accounts · last six months</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#C6A15A]" />Cash reserve</span>
                {reserveCoverage.target > 0 ? <span className="flex items-center gap-1.5"><i className="h-px w-3 border-t border-dashed border-[#D8C38E]" />Target</span> : null}
              </div>
            </div>
            <ReserveProgressChart data={reserveTrend} currency={currency} target={reserveCoverage.target} hasReserveAccount={hasReserveAccount} />
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">The trend uses your opening balances and recorded ledger activity. Your reserve target is a planning reference and does not move money between accounts. The compact six-month view can evolve with real-user feedback.</p>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">Recent activity</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">Your latest ledger entries</p>
                </div>
                <Link className="text-sm font-medium text-lime-300 hover:underline" href="/app/transactions">All transactions</Link>
              </div>
              <TransactionList compact transactions={transactions.slice(0, 10)} />
            </div>

            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-[.15em] text-[var(--muted)]">Safe-to-spend method</p>
              <p className="mt-3 font-display text-xl font-semibold">Online first, cash kept distinct.</p>
              {everydayAccounts.length ? (
                <label className="mt-5 grid gap-2 text-sm">
                  <span className="font-medium">Preferred everyday account</span>
                  <select
                    value={preferredEverydayAccountId}
                    onChange={(event) => {
                      const accountId = event.target.value;
                      setPreferredEverydayAccountId(accountId);
                      writePreferredEverydayAccountId(accountId);
                    }}
                    className="h-10 rounded-xl border border-[var(--line)] bg-[var(--raised)] px-3 text-sm outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/25"
                  >
                    <option value="">No preference</option>
                    {everydayAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                  <span className="text-xs leading-5 text-[var(--muted)]">Saved only on this device. It provides context and does not route payments or change balances.</span>
                </label>
              ) : null}
              {preferredEverydayAccount ? <p className="mt-3 text-xs text-[var(--gold)]">Everyday context: {preferredEverydayAccount.name}</p> : null}
              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between text-[var(--muted)]"><span>UPI / online available</span><span className="font-mono text-[var(--ink)]">{formatMoney(metrics.onlineAvailable, currency)}</span></div>
                <div className="flex justify-between text-[var(--muted)]"><span>Emergency reserve</span><span className="font-mono text-[var(--ink)]">−{formatMoney(settings?.emergency_reserve ?? 0, currency)}</span></div>
                <div className="flex justify-between text-[var(--muted)]"><span>Upcoming commitments</span><span className="font-mono text-[var(--ink)]">−{formatMoney(settings?.upcoming_commitments ?? 0, currency)}</span></div>
                <div className="mt-1 flex justify-between border-t border-[var(--line)] pt-3 font-medium"><span>UPI / online safe</span><span className="font-mono text-[var(--positive)]">{formatMoney(metrics.onlineSafeToSpend, currency)}</span></div>
                <div className="flex justify-between text-[var(--muted)]"><span>Cash in hand</span><span className="font-mono text-[var(--ink)]">+{formatMoney(metrics.cashInHand, currency)}</span></div>
                <div className="mt-1 flex justify-between border-t border-[var(--line)] pt-3 font-medium"><span>Total safe to spend</span><span className="font-mono text-[var(--positive)]">{formatMoney(metrics.totalSafeToSpend, currency)}</span></div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
