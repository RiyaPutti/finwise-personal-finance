"use client";

import { useRef, useState } from "react";
import { FileImage, Loader2, ScanLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/primitives";

export type ReceiptTransactionDraft = { description: string; amount: number; transaction_date: string; notes: string; receipt_id?: string };

export function ReceiptDraftDialog({ open, onClose, onUseDraft }: { open: boolean; onClose: () => void; onUseDraft: (draft: ReceiptTransactionDraft) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ReceiptTransactionDraft | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const extract = async () => {
    if (!file) return setError("Choose a receipt image first.");
    setWorking(true); setError("");
    try { const body = new FormData(); body.set("receipt", file); const response = await fetch("/api/receipt-draft", { method: "POST", body }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setDraft(payload.draft); } catch (reason) { setError(reason instanceof Error ? reason.message : "Receipt drafting failed."); } finally { setWorking(false); }
  };
  const close = () => { setFile(null); setDraft(null); setError(""); onClose(); };
  return <Modal open={open} onClose={close} title="Draft from a receipt"><div className="grid gap-4"><p className="text-sm leading-6 text-[var(--muted)]">Finwise stores this receipt privately in your workspace only after it successfully creates a draft. It is linked only when you review and save the transaction.</p><input ref={inputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setDraft(null); setError(""); }} /><button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--raised)] px-4 text-center transition hover:border-[var(--accent)]"><Upload size={20} className="text-[var(--accent)]" /><span className="mt-2 text-sm font-medium">{file ? file.name : "Choose a receipt image"}</span><span className="mt-1 text-xs text-[var(--muted)]">JPG, PNG, or WEBP · up to 5 MB</span></button>{draft ? <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4"><div className="flex items-center gap-2"><FileImage size={16} className="text-[var(--accent)]" /><p className="font-medium">Review this draft</p></div><dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Description</dt><dd className="text-right">{draft.description}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Amount</dt><dd>{draft.amount || "Needs confirmation"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Date</dt><dd>{draft.transaction_date}</dd></div></dl><Button className="mt-4 w-full" onClick={() => { onUseDraft(draft); close(); }}>Use and review in transaction form</Button></div> : <Button onClick={extract} disabled={!file || working}>{working ? <Loader2 className="animate-spin" size={16} /> : <ScanLine size={16} />}{working ? "Reading receipt…" : "Create draft"}</Button>}{error && <p role="alert" className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}</div></Modal>;
}
