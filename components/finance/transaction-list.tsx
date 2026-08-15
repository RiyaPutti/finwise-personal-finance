"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { TransactionDialog } from "./transaction-dialog";
import { useFinance } from "./finance-provider";
import { financeStore } from "@/lib/finance/store";
import { formatMoney, monetary } from "@/lib/finance/calculations";
import type { Transaction } from "@/lib/finance/types";

export function TransactionList({ transactions, compact = false }: { transactions: Transaction[]; compact?: boolean }) {
  const { accounts, categories, settings, run, transactions: allTransactions } = useFinance(); const [edit, setEdit] = useState<Transaction | undefined>();
  const grouped = useMemo(() => transactions.reduce<Record<string, Transaction[]>>((result, transaction) => { (result[transaction.transaction_date] ||= []).push(transaction); return result; }, {}), [transactions]);
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? "Deleted account";
  const transferCounterpartyName = (transaction: Transaction) => {
    if (!transaction.transfer_id) return "Linked account";
    const pairedTransfer = allTransactions.find((candidate) => candidate.id !== transaction.id && candidate.transfer_id === transaction.transfer_id);
    return pairedTransfer ? accountName(pairedTransfer.account_id) : "Linked account";
  };
  const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name ?? "Transfer";
  if (!transactions.length) return <Card><EmptyState title="No transactions yet" description="Your financial story starts here. Add an income, expense, or transfer when you are ready." /></Card>;
  return <><Card className="overflow-hidden"><div className="finwise-stagger divide-y divide-[var(--line)]">{Object.entries(grouped).map(([date, rows]) => <div key={date}><div className="flex items-center justify-between bg-[var(--raised)]/55 px-4 py-2.5 text-xs font-medium text-[var(--muted)]"><span>{format(parseISO(date), "EEEE, MMMM d")}</span><span>{rows.length} item{rows.length === 1 ? "" : "s"}</span></div>{rows.slice(0, compact ? 5 : undefined).map((transaction) => { const isExpense = transaction.type === "expense"; const Icon = transaction.type === "transfer" ? ArrowLeftRight : isExpense ? ArrowUpRight : ArrowDownLeft; const sign = transaction.type === "transfer" ? transaction.transfer_direction === "in" ? "+" : "−" : isExpense ? "−" : "+"; return <div key={transaction.id} className="finwise-list-row group flex items-center gap-3 px-4 py-3.5"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${transaction.type === "transfer" ? "bg-blue-300/10 text-blue-300" : isExpense ? "bg-[#ef9781]/10 text-[#f6a18b]" : "bg-lime-300/10 text-lime-300"}`}><Icon size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--ink)]">{transaction.description}</p><p className="mt-0.5 truncate text-xs text-[var(--muted)]">{transaction.type === "transfer" ? `${transaction.transfer_direction === "in" ? "From" : "To"}: ${transferCounterpartyName(transaction)}` : `${categoryName(transaction.category_id)} · ${accountName(transaction.account_id)}`}</p></div><p className={`shrink-0 font-mono text-sm font-medium tabular-nums ${isExpense ? "text-[var(--ink)]" : "text-lime-300"}`}>{sign}{formatMoney(monetary(transaction.amount), settings?.currency)}</p>{!compact && <div className="hidden items-center gap-1 group-hover:flex"><button className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--raised)]" onClick={() => setEdit(transaction)} aria-label="Edit transaction"><Pencil size={14} /></button><button className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[#ef9781]/10 hover:text-[#f6a18b]" onClick={() => { if (confirm("Delete this transaction? Account balances and analytics will recalculate.")) void run(() => financeStore.deleteTransaction(transaction.id), "Transaction deleted."); }} aria-label="Delete transaction"><Trash2 size={14} /></button></div>}<MoreHorizontal className="text-[var(--muted)] group-hover:hidden" size={17} /></div>; })}</div>)}</div></Card>{edit && <TransactionDialog open={Boolean(edit)} onClose={() => setEdit(undefined)} transaction={edit} />}</>;
}
