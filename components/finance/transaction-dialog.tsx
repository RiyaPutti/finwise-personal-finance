"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeftRight, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Modal, Segmented, Select, Textarea } from "@/components/ui/primitives";
import { useFinance } from "@/components/finance/finance-provider";
import { financeStore } from "@/lib/finance/store";
import { transactionSchema, transferSchema } from "@/lib/finance/validation";
import { defaultPaymentMethodForAccount, paymentMethods } from "@/lib/finance/payment-methods";
import { categoryRulesStorageKey, findCategoryRule, type CategoryRule } from "@/lib/finance/category-rules";
import type { PaymentMethod, Transaction } from "@/lib/finance/types";
import type { ReceiptTransactionDraft } from "./receipt-draft-dialog";

const today = () => format(new Date(), "yyyy-MM-dd");

type EntryForm = {
  account_id: string;
  category_id: string;
  type: "income" | "expense";
  amount: string;
  description: string;
  transaction_date: string;
  payment_method: string;
  need_want: "need" | "planned_want" | "impulse";
  notes: string;
  is_recurring: boolean;
  recurrence_interval: "weekly" | "monthly" | "yearly";
  next_due_date: string;
  receipt_id: string | null;
};

const initialEntryForm = (transaction?: Transaction, draft?: ReceiptTransactionDraft | null): EntryForm => ({
  account_id: transaction?.account_id ?? "",
  category_id: transaction?.category_id ?? "",
  type: transaction?.type === "income" ? "income" : "expense",
  amount: transaction?.amount?.toString() ?? (draft?.amount ? String(draft.amount) : ""),
  description: transaction?.description ?? draft?.description ?? "",
  transaction_date: transaction?.transaction_date ?? draft?.transaction_date ?? today(),
  payment_method: transaction?.payment_method ?? "",
  need_want: transaction?.need_want ?? "need",
  notes: transaction?.notes ?? draft?.notes ?? "",
  is_recurring: transaction?.is_recurring ?? false,
  recurrence_interval: transaction?.recurrence_interval ?? "monthly",
  next_due_date: transaction?.next_due_date ?? "",
  receipt_id: draft?.receipt_id ?? null,
});

export function TransactionDialog({ open, onClose, transaction, draft }: { open: boolean; onClose: () => void; transaction?: Transaction; draft?: ReceiptTransactionDraft | null }) {
  const { accounts, categories, run } = useFinance();
  const [mode, setMode] = useState<"entry" | "transfer">(transaction?.type === "transfer" ? "transfer" : "entry");
  const [form, setForm] = useState<EntryForm>(() => initialEntryForm(transaction, draft));
  const [transfer, setTransfer] = useState({ source_account_id: "", destination_account_id: "", amount: "", description: "", transaction_date: today(), notes: "" });
  const [formError, setFormError] = useState("");
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const activeAccounts = useMemo(() => accounts.filter((account) => !account.is_archived), [accounts]);
  const directTransactionAccounts = useMemo(() => activeAccounts.filter((account) => account.type !== "cash_reserve"), [activeAccounts]);

  const recommendedMethod = (accountId: string) => {
    const account = activeAccounts.find((item) => item.id === accountId);
    const saved = typeof window === "undefined" ? null : window.localStorage.getItem(`finwise:last-payment-method:${accountId}`) as PaymentMethod | null;
    return defaultPaymentMethodForAccount(account?.type, paymentMethods.includes(saved as PaymentMethod) ? saved : null) ?? "";
  };

  useEffect(() => {
    if (!open || transaction) return;
    const initialAccount = directTransactionAccounts[0];
    setForm({ ...initialEntryForm(undefined, draft), account_id: initialAccount?.id ?? "", payment_method: initialAccount ? recommendedMethod(initialAccount.id) : "" });
    setFormError("");
  }, [open, transaction, directTransactionAccounts, draft]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(categoryRulesStorageKey) ?? "[]");
      setCategoryRules(Array.isArray(stored) ? stored : []);
    } catch {
      setCategoryRules([]);
    }
  }, [open]);

  const selectedAccount = directTransactionAccounts.find((account) => account.id === form.account_id);
  const suggestedRule = form.type === "expense" && !form.category_id ? findCategoryRule(form.description, categoryRules) : null;
  const suggestedCategory = suggestedRule ? categories.find((category) => category.id === suggestedRule.category_id) : null;
  const set = (key: keyof EntryForm, value: string | boolean) => { setFormError(""); setForm((current) => ({ ...current, [key]: value } as EntryForm)); };
  const selectAccount = (accountId: string) => { setFormError(""); setForm((current) => ({ ...current, account_id: accountId, payment_method: recommendedMethod(accountId) })); };

  const saveEntry = async () => {
    if (!selectedAccount) return setFormError("Choose the account used for this transaction.");
    if (form.type === "expense" && selectedAccount.type !== "cash" && !form.payment_method) return setFormError("Select the payment method used for this non-cash account.");
    const payment_method = form.type === "expense" ? selectedAccount.type === "cash" ? "cash" : form.payment_method || null : null;
    const parsed = transactionSchema.safeParse({ ...form, amount: Number(form.amount), category_id: form.category_id || null, payment_method, need_want: form.need_want || null, notes: form.notes || null, recurrence_interval: form.is_recurring ? form.recurrence_interval : null, next_due_date: form.is_recurring ? form.next_due_date || null : null, receipt_id: form.receipt_id });
    if (!parsed.success) return setFormError(parsed.error.issues[0]?.message ?? "Check the transaction details.");
    const result = await run(() => financeStore.saveTransaction(parsed.data, transaction?.id), transaction ? "Transaction updated." : "Transaction recorded.");
    if (result) {
      if (payment_method) window.localStorage.setItem(`finwise:last-payment-method:${selectedAccount.id}`, payment_method);
      onClose();
    }
  };

  const saveTransfer = async () => {
    const parsed = transferSchema.safeParse({ ...transfer, amount: Number(transfer.amount), notes: transfer.notes || null });
    if (!parsed.success) return;
    const result = await run(() => financeStore.createTransfer(parsed.data), "Transfer recorded. Balances are updated.");
    if (result) onClose();
  };

  return <Modal open={open} onClose={onClose} title={transaction ? "Edit transaction" : mode === "transfer" ? "Move money" : "Add transaction"}>
    {!transaction && <div className="mb-6"><Segmented value={mode} onChange={(value) => setMode(value as "entry" | "transfer")} options={[{ value: "entry", label: "Income or expense" }, { value: "transfer", label: "Transfer" }]} /></div>}
    {mode === "entry" ? <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type"><Select value={form.type} onChange={(event) => set("type", event.target.value)}><option value="expense">Expense</option><option value="income">Income</option></Select></Field>
        <Field label="Amount"><Input autoFocus inputMode="decimal" value={form.amount} onChange={(event) => set("amount", event.target.value)} placeholder="0.00" /></Field>
      </div>
      <Field label="Description"><Input value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Coffee, salary, electricity…" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account" hint="Cash Reserve accounts are available only when you move money."><Select value={form.account_id} onChange={(event) => selectAccount(event.target.value)}><option value="">Choose account</option>{directTransactionAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" value={form.transaction_date} onChange={(event) => set("transaction_date", event.target.value)} /></Field>
      </div>
      {form.type === "expense" && <>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><Select value={form.category_id} onChange={(event) => set("category_id", event.target.value)}><option value="">Uncategorised</option>{categories.filter((category) => !category.is_archived).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>
          <Field label="Payment method" hint={selectedAccount?.type === "cash" ? "Cash Wallet selected — Cash is applied automatically." : "Select the payment channel used."}><Select value={form.payment_method} onChange={(event) => set("payment_method", event.target.value)} disabled={selectedAccount?.type === "cash"}><option value="">Select payment method</option>{paymentMethods.map((method) => <option key={method} value={method}>{method.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")}</option>)}</Select></Field>
          <Field label="Intent"><Select value={form.need_want} onChange={(event) => set("need_want", event.target.value)}><option value="need">Need</option><option value="planned_want">Planned want</option><option value="impulse">Impulse</option></Select></Field>
        </div>
        {suggestedRule && suggestedCategory && <div className="-mt-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-3 py-2.5 text-xs text-[var(--muted)]"><span><strong className="text-[var(--ink)]">Saved rule:</strong> “{suggestedRule.match}” can be {suggestedCategory.name}.</span><button type="button" className="font-medium text-[var(--accent)] hover:underline" onClick={() => set("category_id", suggestedRule.category_id)}>Apply suggestion</button></div>}
        {selectedAccount?.type !== "cash" && <p className="-mt-1 text-xs leading-5 text-[var(--muted)]">For bank, card, and online accounts, choose UPI, card, bank transfer, or another method so spending analysis stays accurate.</p>}
      </>}
      <label className="flex items-center gap-2 rounded-xl bg-[var(--raised)] px-3 py-2.5 text-sm text-[var(--ink)]"><input type="checkbox" checked={form.is_recurring} onChange={(event) => set("is_recurring", event.target.checked)} className="accent-[var(--accent)]" />Mark as recurring</label>
      {form.is_recurring && <div className="grid grid-cols-2 gap-3"><Field label="Repeat"><Select value={form.recurrence_interval} onChange={(event) => set("recurrence_interval", event.target.value)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field><Field label="Next due"><Input type="date" value={form.next_due_date} onChange={(event) => set("next_due_date", event.target.value)} /></Field></div>}
      <Field label="Notes" hint="Optional"><Textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Add a useful detail…" /></Field>
      {formError && <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">{formError}</p>}
      <Button size="lg" onClick={saveEntry}><ReceiptText size={17} />{transaction ? "Save changes" : "Save transaction"}</Button>
    </div> : <div className="grid gap-4">
      <p className="rounded-xl border border-blue-300/15 bg-blue-300/10 px-3 py-2.5 text-xs leading-5 text-blue-100">Transfers change account balances but are never counted as spending.</p>
      <Field label="From"><Select value={transfer.source_account_id} onChange={(event) => setTransfer((current) => ({ ...current, source_account_id: event.target.value }))}><option value="">Choose source account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>
      <Field label="To"><Select value={transfer.destination_account_id} onChange={(event) => setTransfer((current) => ({ ...current, destination_account_id: event.target.value }))}><option value="">Choose destination account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Amount"><Input autoFocus inputMode="decimal" value={transfer.amount} onChange={(event) => setTransfer((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" /></Field><Field label="Date"><Input type="date" value={transfer.transaction_date} onChange={(event) => setTransfer((current) => ({ ...current, transaction_date: event.target.value }))} /></Field></div>
      <Field label="Description"><Input value={transfer.description} onChange={(event) => setTransfer((current) => ({ ...current, description: event.target.value }))} placeholder="Move to cash reserve" /></Field>
      <Field label="Notes" hint="Optional"><Textarea value={transfer.notes} onChange={(event) => setTransfer((current) => ({ ...current, notes: event.target.value }))} /></Field>
      <Button size="lg" onClick={saveTransfer}><ArrowLeftRight size={17} />Record transfer</Button>
    </div>}
  </Modal>;
}
