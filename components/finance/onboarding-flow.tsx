"use client";

import { useState } from "react";
import { Check, ChevronRight, Compass, Landmark, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/primitives";
import { financeStore } from "@/lib/finance/store";
import { useFinance } from "./finance-provider";

const steps = [
  { icon: Compass, eyebrow: "Your private workspace", title: "Welcome to Finwise", description: "Your ledger, accounts, budgets, and goals live in one focused financial workspace. Nothing moves automatically." },
  { icon: Landmark, eyebrow: "Start with visibility", title: "Add the accounts you use", description: "Set up a cash wallet, bank account, or card so your dashboard starts with an accurate financial view." },
  { icon: WalletCards, eyebrow: "Create gentle boundaries", title: "Use budgets as a watch, not a warning", description: "Set category budgets when helpful. Your monthly budget watch can flag progress at thresholds you choose in Settings." },
];

export function OnboardingFlow() {
  const { settings, run } = useFinance();
  const [step, setStep] = useState(0);
  const active = settings?.onboarding_status === "active";
  const current = steps[step];
  const Icon = current.icon;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const finish = (status: "dismissed" | "completed") => run(() => financeStore.updateSettings({ onboarding_status: status }), status === "completed" ? "Your Finwise orientation is complete." : "Orientation dismissed. You can restart it anytime in Settings.");

  return <Modal open={active} onClose={() => { void finish("dismissed"); }} title="A clearer way to manage money">
    <div className="grid gap-6">
      <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold uppercase tracking-[.14em] text-[var(--accent)]">Getting started</span><span className="font-medium text-[var(--muted)]">Step {step + 1} of {steps.length}</span></div><div className="flex gap-2" aria-label={`Step ${step + 1} of ${steps.length}`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} role="progressbar">{steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none ${index <= step ? "bg-[var(--accent)]" : "bg-[var(--raised)]"}`} />)}</div></div>
      <div key={current.title} className="finwise-reveal grid gap-5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={22} /></div><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--accent)]">{current.eyebrow}</p><h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{current.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{current.description}</p></div></div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><Button variant="quiet" onClick={() => { void finish("dismissed"); }}>Skip for now</Button>{step < steps.length - 1 ? <Button onClick={() => setStep((value) => value + 1)}>Next <ChevronRight size={16} /></Button> : <Button onClick={() => { void finish("completed"); }}><Check size={16} />Enter workspace</Button>}</div>
    </div>
  </Modal>;
}
