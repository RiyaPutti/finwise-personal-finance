"use client";

import { ArchiveRestore, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { format } from "date-fns";
import { backupReminderDue } from "@/lib/finance/calculations";
import { financeStore } from "@/lib/finance/store";
import { useFinance } from "./finance-provider";

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export function BackupReminderCard() {
  const { settings, run } = useFinance();
  if (!backupReminderDue(settings)) return null;
  const acknowledge = () => financeStore.updateSettings({ backup_reminder_last_acknowledged_on: format(new Date(), "yyyy-MM-dd") });
  const downloadBackup = () => run(async () => {
    download(`finwise-backup-${format(new Date(), "yyyy-MM-dd")}.json`, await financeStore.exportJson());
    await acknowledge();
  }, "Backup downloaded. We’ll surface this reminder again in about a month.");
  const remindLater = () => run(acknowledge, "We’ll surface this reminder again in about a month.");

  return <Card className="border-[color:var(--accent)]/20 bg-[var(--accent-soft)] p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--panel)] text-[var(--accent)] shadow-sm"><ArchiveRestore size={18} /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-semibold">Keep a current backup</h2><span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]"><ShieldCheck size={13} />Your data stays under your control</span></div><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">Save a portable JSON copy of your accounts, ledger, budgets, goals, and preferences. This is an in-app reminder only; no backup is created or sent automatically.</p></div></div>
    <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button onClick={downloadBackup}><Download size={16} />Download JSON backup</Button><Button variant="quiet" onClick={remindLater}>Remind me next month</Button></div>
  </Card>;
}
