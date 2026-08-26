"use client";

import { useState } from "react";
import { Archive, ArrowRightLeft, BarChart3, CircleDollarSign, CreditCard, Landmark, Pencil, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Field, Input, Modal } from "@/components/ui/primitives";
import { useFinance } from "./finance-provider";
import { AccountDialog } from "./account-dialog";
import { TransactionDialog } from "./transaction-dialog";
import { accountBalance, formatMoney, monetary } from "@/lib/finance/calculations";
import { financeStore } from "@/lib/finance/store";
import type { Account } from "@/lib/finance/types";
import { DEFAULT_WORKSPACE_CURRENCY } from "@/lib/finance/currency";

const labels: Record<Account["type"], string> = {
  bank: "Bank",
  cash: "Cash wallet",
  cash_reserve: "Cash reserve",
  savings: "Savings",
  credit_card: "Credit card",
  investment: "Investment",
  other: "Other",
};

const roleLabels: Record<Account["type"], string> = {
  bank: "UPI / online spending",
  cash: "Cash in hand",
  cash_reserve: "Reserve only",
  savings: "Held aside",
  credit_card: "Credit line",
  investment: "Long-term holding",
  other: "Everyday online",
};

const iconMap: Record<Account["type"], typeof Landmark> = {
  bank: Landmark,
  cash: Wallet,
  cash_reserve: Archive,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: BarChart3,
  other: CircleDollarSign,
};

function AccountCard({ account, transactions, currency, onEdit, onLifecycle }: {
  account: Account;
  transactions: ReturnType<typeof useFinance>["transactions"];
  currency: string;
  onEdit: () => void;
  onLifecycle: () => void;
}) {
  const balance = accountBalance(account, transactions);
  const Icon = iconMap[account.type];

  return <Card className="group relative overflow-hidden p-5">
    <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full bg-[var(--accent)] opacity-[.05] blur-2xl" />
    <div className="relative z-10 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--raised)] text-[var(--accent)]"><Icon size={17} /></span>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold">{account.name}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{labels[account.type]} · {roleLabels[account.type]}</p>
        </div>
      </div>
      <button type="button" aria-label={`Edit ${account.name}`} onClick={onEdit} className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--raised)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><Pencil size={16} /></button>
    </div>
    <p className={`relative z-10 mt-8 font-mono text-3xl font-medium tracking-tight tabular-nums ${balance < 0 ? "text-[#f6a18b]" : ""}`}>{formatMoney(balance, account.currency || currency)}</p>
    <div className="relative z-10 mt-6 flex items-center justify-between border-t border-[var(--line)] pt-4">
      <span className="text-xs text-[var(--muted)]">Opening {formatMoney(monetary(account.opening_balance), account.currency || currency)}</span>
      <button type="button" onClick={onLifecycle} className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"><Archive size={13} />Manage</button>
    </div>
  </Card>;
}

export function AccountsScreen() {
  const { accounts, transactions, settings, run } = useFinance();
  const [dialog, setDialog] = useState<Account | null | undefined>(undefined);
  const [transferOpen, setTransferOpen] = useState(false);
  const [managedAccount, setManagedAccount] = useState<Account | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const currency = settings?.currency ?? DEFAULT_WORKSPACE_CURRENCY;
  const active = accounts.filter((account) => !account.is_archived);
  const archived = accounts.filter((account) => account.is_archived);
  const hasHistory = managedAccount ? transactions.some((transaction) => transaction.account_id === managedAccount.id) : false;

  const closeLifecycle = () => {
    setManagedAccount(null);
    setConfirmation("");
  };
  const archive = async () => {
    if (!managedAccount || confirmation !== "ARCHIVE") return;
    const result = await run(() => financeStore.archiveAccount(managedAccount.id), "Account archived. It remains in your history.");
    if (result) closeLifecycle();
  };
  const restore = async (account: Account) => {
    await run(() => financeStore.archiveAccount(account.id, false), "Account restored.");
  };
  const remove = async () => {
    if (!managedAccount || hasHistory || confirmation !== "DELETE") return;
    const result = await run(() => financeStore.deleteAccount(managedAccount.id), "Account permanently deleted.");
    if (result) closeLifecycle();
  };

  return <div className="grid gap-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-medium uppercase tracking-[.18em] text-lime-300">Accounts</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Every place your money lives.</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Current balances are calculated from the ledger, not maintained manually.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="quiet" onClick={() => setTransferOpen(true)}><ArrowRightLeft size={16} />Transfer</Button>
        <Button onClick={() => setDialog(null)}><Plus size={16} />Add account</Button>
      </div>
    </div>

    {!active.length ? <Card><EmptyState title="No active accounts" description="Create a bank account, cash wallet, reserve, savings account, or another place you track money." action={<Button onClick={() => setDialog(null)}>Create an account</Button>} /></Card> : <div data-finwise-motion="account-collection" className="finwise-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map((account) => <AccountCard key={account.id} account={account} transactions={transactions} currency={currency} onEdit={() => setDialog(account)} onLifecycle={() => setManagedAccount(account)} />)}</div>}

    {archived.length > 0 && <Card data-finwise-motion="archived-account-collection" className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-base font-semibold">Archived accounts</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Archived accounts stay in your financial history and cannot receive new transactions until you restore them.</p>
        </div>
        <Archive size={18} className="text-[var(--muted)]" />
      </div>
      <div className="mt-4 divide-y divide-[var(--line)]">
        {archived.map((account) => {
          const Icon = iconMap[account.type];
          return <div key={account.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--raised)] text-[var(--accent)]"><Icon size={15} /></span>
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--ink)]">{account.name}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{labels[account.type]} · {roleLabels[account.type]} · archived</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="quiet" size="sm" onClick={() => void restore(account)}>Restore</Button>
              {!transactions.some((transaction) => transaction.account_id === account.id) && <button type="button" onClick={() => setManagedAccount(account)} className="rounded-lg px-2 py-1 text-xs text-[#f6a18b] hover:bg-[#f6a18b]/10 hover:text-[#ffc3b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6a18b]">Delete</button>}
            </div>
          </div>;
        })}
      </div>
    </Card>}

    <AccountDialog open={dialog !== undefined} onClose={() => setDialog(undefined)} account={dialog ?? undefined} />
    <TransactionDialog open={transferOpen} onClose={() => setTransferOpen(false)} />
    <Modal open={managedAccount !== null} onClose={closeLifecycle} title={managedAccount?.is_archived ? "Manage archived account" : "Archive account"}>
      <div className="grid gap-5">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--raised)] p-4 text-sm leading-6 text-[var(--muted)]">{managedAccount?.is_archived ? "This account is archived. You can restore it to use it again, or permanently delete it only when it has no transaction history." : <>Archiving <span className="font-medium text-[var(--ink)]">{managedAccount?.name}</span> keeps it and all of its history intact, but prevents new transactions and transfers.</>}</div>
        {!managedAccount?.is_archived && <>
          <Field label="Type ARCHIVE to confirm"><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="ARCHIVE" autoComplete="off" /></Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="quiet" onClick={closeLifecycle}>Cancel</Button><Button onClick={archive} disabled={confirmation !== "ARCHIVE"}><Archive size={16} />Archive account</Button></div>
        </>}
        {managedAccount?.is_archived && <>{hasHistory ? <p className="rounded-xl border border-[var(--line)] bg-[var(--raised)] p-3 text-sm leading-6 text-[var(--muted)]">This account has transaction history, so permanent deletion is blocked to protect your ledger. You can restore it instead.</p> : <>
          <Field label="Type DELETE to permanently remove this empty account"><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE" autoComplete="off" /></Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="quiet" onClick={closeLifecycle}>Cancel</Button><Button variant="danger" onClick={remove} disabled={confirmation !== "DELETE"}><Trash2 size={16} />Delete account</Button></div>
        </>}</>}
      </div>
    </Modal>
  </div>;
}
