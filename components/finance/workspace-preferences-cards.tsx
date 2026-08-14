"use client";

import { useEffect, useState } from "react";
import { BellRing, Compass, RotateCcw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input } from "@/components/ui/primitives";
import { financeStore } from "@/lib/finance/store";
import { useFinance } from "./finance-provider";

const fallback = { warningLabel: "Watch", warningColor: "#B8965A", criticalLabel: "Critical", criticalColor: "#C06C5D" };
const validColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

export function WorkspacePreferencesCards() {
  const { settings, run } = useFinance();
  const [enabled, setEnabled] = useState(settings?.budget_watch_enabled ?? true);
  const [warning, setWarning] = useState(String(settings?.budget_watch_warning_percent ?? 75));
  const [critical, setCritical] = useState(String(settings?.budget_watch_critical_percent ?? 90));
  const [warningLabel, setWarningLabel] = useState(settings?.budget_watch_warning_label ?? fallback.warningLabel);
  const [warningColor, setWarningColor] = useState(settings?.budget_watch_warning_color ?? fallback.warningColor);
  const [criticalLabel, setCriticalLabel] = useState(settings?.budget_watch_critical_label ?? fallback.criticalLabel);
  const [criticalColor, setCriticalColor] = useState(settings?.budget_watch_critical_color ?? fallback.criticalColor);

  useEffect(() => {
    setEnabled(settings?.budget_watch_enabled ?? true);
    setWarning(String(settings?.budget_watch_warning_percent ?? 75));
    setCritical(String(settings?.budget_watch_critical_percent ?? 90));
    setWarningLabel(settings?.budget_watch_warning_label ?? fallback.warningLabel);
    setWarningColor(settings?.budget_watch_warning_color ?? fallback.warningColor);
    setCriticalLabel(settings?.budget_watch_critical_label ?? fallback.criticalLabel);
    setCriticalColor(settings?.budget_watch_critical_color ?? fallback.criticalColor);
  }, [settings]);

  const saveWatch = () => {
    const warningPercent = Number(warning);
    const criticalPercent = Number(critical);
    const labelsValid = warningLabel.trim().length > 0 && warningLabel.trim().length <= 32 && criticalLabel.trim().length > 0 && criticalLabel.trim().length <= 32;
    if (!(warningPercent >= 1 && warningPercent <= 99 && criticalPercent > warningPercent && criticalPercent <= 100 && labelsValid && validColor(warningColor) && validColor(criticalColor))) return;
    void run(() => financeStore.updateSettings({ budget_watch_enabled: enabled, budget_watch_warning_percent: warningPercent, budget_watch_critical_percent: criticalPercent, budget_watch_warning_label: warningLabel.trim(), budget_watch_warning_color: warningColor, budget_watch_critical_label: criticalLabel.trim(), budget_watch_critical_color: criticalColor }), "Monthly budget watch updated.");
  };

  return <>
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><BellRing size={18} /></span><div><h2 className="font-display text-lg font-semibold">Monthly budget watch</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">See a calm in-app signal when an active budget reaches your chosen percentage. This does not send emails, create scheduled jobs, or change a budget.</p></div></div><button type="button" onClick={() => setEnabled((value) => !value)} aria-pressed={enabled} className={`relative mt-1 h-7 w-12 rounded-full transition ${enabled ? "bg-[var(--accent)]" : "bg-[var(--raised)]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-[var(--panel)] shadow-sm transition ${enabled ? "left-6" : "left-1"}`} /></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Watch threshold" hint="Show a gentle in-app signal from this percentage."><Input inputMode="numeric" min="1" max="99" value={warning} onChange={(event) => setWarning(event.target.value)} disabled={!enabled} /></Field><Field label="Critical threshold" hint="Use a stronger in-app signal above the watch threshold."><Input inputMode="numeric" min="2" max="100" value={critical} onChange={(event) => setCritical(event.target.value)} disabled={!enabled} /></Field></div>
      <div className="mt-6 border-t border-[var(--line)] pt-5"><div className="flex items-start gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--raised)] text-[var(--accent)]"><Tag size={16} /></span><div><h3 className="font-medium">Alert tags and color codes</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Name the two in-app watch states in your own language and choose their appearance. These labels never change the budget calculation.</p></div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Watch tag" hint="Up to 32 characters"><Input maxLength={32} value={warningLabel} onChange={(event) => setWarningLabel(event.target.value)} disabled={!enabled} /></Field><Field label="Watch color"><div className="flex items-center gap-3"><Input type="color" aria-label="Watch color" className="h-10 w-14 p-1" value={warningColor} onChange={(event) => setWarningColor(event.target.value.toUpperCase())} disabled={!enabled} /><Input maxLength={7} aria-label="Watch hex color" value={warningColor} onChange={(event) => setWarningColor(event.target.value.toUpperCase())} disabled={!enabled} /></div></Field><Field label="Critical tag" hint="Up to 32 characters"><Input maxLength={32} value={criticalLabel} onChange={(event) => setCriticalLabel(event.target.value)} disabled={!enabled} /></Field><Field label="Critical color"><div className="flex items-center gap-3"><Input type="color" aria-label="Critical color" className="h-10 w-14 p-1" value={criticalColor} onChange={(event) => setCriticalColor(event.target.value.toUpperCase())} disabled={!enabled} /><Input maxLength={7} aria-label="Critical hex color" value={criticalColor} onChange={(event) => setCriticalColor(event.target.value.toUpperCase())} disabled={!enabled} /></div></Field></div></div>
      <Button className="mt-5" onClick={saveWatch}>Save budget watch</Button>
    </Card>
    <Card className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--raised)] text-[var(--accent)]"><Compass size={18} /></span><div><h2 className="font-display text-lg font-semibold">Workspace orientation</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Replay the short Finwise orientation whenever you want a reminder of the workspace flow.</p></div></div><Button variant="quiet" onClick={() => { void run(() => financeStore.updateSettings({ onboarding_status: "active" }), "Orientation restarted."); }}><RotateCcw size={16} />Replay</Button></div></Card>
  </>;
}
