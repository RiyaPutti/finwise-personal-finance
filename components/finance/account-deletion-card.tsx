"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Modal } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";

const confirmationPhrase = "DELETE";

export function AccountDeletionCard() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmed = confirmation === confirmationPhrase;

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setConfirmation("");
  };

  const deleteAccount = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);

    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Unable to delete your account. Please try again.");

      toast.success("Your Finwise account has been deleted.");
      try {
        await createClient().auth.signOut({ scope: "local" });
      } finally {
        window.location.assign("/auth");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete your account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-[#f1967e]/30 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f1967e]/12 text-[#f6a18b]">
            <AlertTriangle size={17} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[.18em] text-[#f6a18b]">Danger zone</p>
            <h2 className="mt-1 font-display text-lg font-semibold">Delete your Finwise account</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Permanently delete your account and the financial data connected to it. Export a backup first if you want to retain a copy.</p>
          </div>
        </div>
        <Button variant="danger" className="mt-5" onClick={() => setOpen(true)}>
          <Trash2 size={16} />Delete Account
        </Button>
      </Card>

      <Modal open={open} onClose={close} title="Delete your account">
        <div className="grid gap-5">
          <div className="rounded-xl border border-[#f1967e]/25 bg-[#f1967e]/10 p-4 text-sm leading-6 text-[var(--ink)]">
            This action is permanent. Your Finwise profile, settings, accounts, transactions, budgets, goals, and contribution history will be deleted. This cannot be undone.
          </div>
          <Field label={`Type ${confirmationPhrase} to confirm`}>
            <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={confirmationPhrase} autoComplete="off" disabled={deleting} />
          </Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="quiet" onClick={close} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={deleteAccount} disabled={!confirmed || deleting}>
              <Trash2 size={16} />{deleting ? "Deleting account…" : "Permanently delete account"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
