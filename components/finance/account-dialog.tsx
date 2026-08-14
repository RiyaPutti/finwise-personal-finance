"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Modal, Select } from "@/components/ui/primitives";
import { useFinance } from "./finance-provider";
import { financeStore } from "@/lib/finance/store";
import { accountSchema } from "@/lib/finance/validation";
import type { Account, AccountType } from "@/lib/finance/types";
import { DEFAULT_WORKSPACE_CURRENCY } from "@/lib/finance/currency";

const accountTypes: { value: AccountType; label: string; hint: string }[] = [
  { value: "bank", label: "Bank", hint: "Checking or everyday bank account" }, { value: "cash", label: "Cash wallet", hint: "Physical cash you can spend" },
  { value: "cash_reserve", label: "Cash reserve", hint: "Physical cash kept aside" }, { value: "savings", label: "Savings", hint: "Savings account or designated fund" },
  { value: "credit_card", label: "Credit card", hint: "Credit balance or card liability" }, { value: "investment", label: "Investment", hint: "Long-term investment balance" }, { value: "other", label: "Other", hint: "Another money location" },
];
export function AccountDialog({ open, onClose, account }: { open: boolean; onClose: () => void; account?: Account }) {
  const { settings, run } = useFinance(); const [form, setForm] = useState({ name: account?.name ?? "", type: account?.type ?? "bank" as AccountType, opening_balance: account?.opening_balance?.toString() ?? "0", currency: account?.currency ?? settings?.currency ?? DEFAULT_WORKSPACE_CURRENCY });
  useEffect(() => { if (open) setForm({ name: account?.name ?? "", type: account?.type ?? "bank", opening_balance: account?.opening_balance?.toString() ?? "0", currency: account?.currency ?? settings?.currency ?? DEFAULT_WORKSPACE_CURRENCY }); }, [open, account, settings?.currency]);
  const save = async () => { const parsed = accountSchema.safeParse({ ...form, opening_balance: Number(form.opening_balance), currency: form.currency.toUpperCase() }); if (!parsed.success) return; const result = await run(() => financeStore.saveAccount(parsed.data, account?.id), account ? "Account updated." : "Account created."); if (result) onClose(); };
  return <Modal open={open} onClose={onClose} title={account ? "Edit account" : "Add account"}><div className="grid gap-4"><Field label="Account name"><Input autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Everyday bank" /></Field><Field label="Type"><Select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AccountType }))}>{accountTypes.map((type) => <option key={type.value} value={type.value}>{type.label} — {type.hint}</option>)}</Select></Field><div className="grid grid-cols-2 gap-3"><Field label="Opening balance" hint="The balance when tracking begins"><Input inputMode="decimal" value={form.opening_balance} onChange={(event) => setForm((current) => ({ ...current, opening_balance: event.target.value }))} /></Field><Field label="Currency"><Input maxLength={3} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} placeholder={DEFAULT_WORKSPACE_CURRENCY} /></Field></div><p className="rounded-xl bg-[var(--raised)] px-3 py-2.5 text-xs leading-5 text-[var(--muted)]">Current balances are calculated from this opening balance and your ledger. Editing it will recalculate the account history.</p><Button size="lg" onClick={save}>{account ? "Save account" : "Create account"}</Button></div></Modal>;
}
