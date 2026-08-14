"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { BadgeAlert, CircleCheck, FolderSearch, PencilLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { useFinance } from "./finance-provider";
import { TransactionDialog } from "./transaction-dialog";
import { formatMoney, transactionReviewQueue } from "@/lib/finance/calculations";
import type { Transaction } from "@/lib/finance/types";

export function TransactionReviewScreen() {
  const { accounts, categories, settings, transactions, loading } = useFinance();
  const [editing, setEditing] = useState<Transaction | undefined>();
  const reviewItems = transactionReviewQueue(transactions);
  const currency = settings?.currency ?? "INR";
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? "Deleted account";
  const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name ?? "Uncategorised";

  if (loading) return <div className="grid gap-5"><div className="h-8 w-44 animate-pulse rounded bg-[var(--raised)]" />{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-[var(--raised)]" />)}</div>;
  return <div className="grid gap-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[.18em] text-[var(--accent)]">Transaction review</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Keep the details that make your money clear.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">This optional queue highlights uncategorised expenses and category outliers with no note. It never changes a transaction until you review and save it.</p></div><div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--raised)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]"><CircleCheck size={14} className="text-[var(--positive)]" />{reviewItems.length} item{reviewItems.length === 1 ? "" : "s"} to review</div></div>
    {!reviewItems.length ? <Card><EmptyState title="Your transaction details are in good shape" description="There are no uncategorised expenses or note-free category outliers to review right now." action={<a href="/app/transactions"><Button variant="quiet">Open transactions</Button></a>} /></Card> : <div className="grid gap-4">{reviewItems.map(({ transaction, reasons, typicalAmount }) => <Card key={transaction.id} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${reasons.includes("uncategorized") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{reasons.includes("uncategorized") ? <FolderSearch size={18} /> : <BadgeAlert size={18} />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium">{transaction.description}</p>{reasons.map((reason) => <span key={reason} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${reason === "uncategorized" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{reason === "uncategorized" ? "Needs a category" : "Unusual amount"}</span>)}</div><p className="mt-1 text-sm text-[var(--muted)]">{format(parseISO(transaction.transaction_date), "MMM d, yyyy")} · {categoryName(transaction.category_id)} · {accountName(transaction.account_id)}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{reasons.includes("uncategorized") ? "Assign a category so this expense is reflected in your analysis and budget history." : `This is at least twice the typical amount for its category (${formatMoney(typicalAmount ?? 0, currency)}). Add a useful note or confirm the detail.`}</p></div></div><div className="flex shrink-0 items-center justify-between gap-4 sm:block sm:text-right"><p className="font-mono text-base font-medium tabular-nums">−{formatMoney(transaction.amount, currency)}</p><Button className="mt-0 sm:mt-3" size="sm" variant="quiet" onClick={() => setEditing(transaction)}><PencilLine size={15} />Review</Button></div></div></Card>)}</div>}
    <Card className="p-5"><div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--positive-soft)] text-[var(--positive)]"><Sparkles size={17} /></div><div><p className="font-medium">A focused queue, not another obligation.</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">The queue appears only when an expense is missing a category or stands out against its category’s own history. Marking an item reviewed happens naturally when you save a category or note.</p></div></div></Card>
    {editing && <TransactionDialog open={Boolean(editing)} onClose={() => setEditing(undefined)} transaction={editing} />}
  </div>;
}
