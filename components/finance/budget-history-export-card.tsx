"use client";

import { useState } from "react";
import { Download, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input } from "@/components/ui/primitives";
import { useFinance } from "./finance-provider";

export function BudgetHistoryExportCard() {
  const { run } = useFinance();
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const downloadBudgetHistory = () => run(async () => {
    if ((start && !end) || (!start && end) || (start && end && start > end)) throw new Error("Choose both export dates, with an end date on or after the start date.");
    const params = new URLSearchParams({ scope: "budget-history" }); if (start && end) { params.set("start", start); params.set("end", end); }
    const response = await fetch(`/api/export?${params.toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Unable to create the budget-history export." }));
      throw new Error(payload.error ?? "Unable to create the budget-history export.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finwise-budget-history-and-preferences${start && end ? `-${start}-to-${end}` : ""}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, "Budget history and preferences exported.");

  return <Card className="p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><TableProperties size={18} /></span><div><h2 className="font-display text-lg font-semibold">Budget history and preferences</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">Download an authenticated CSV with each saved budget’s period, progress, custom thresholds, and current workspace preferences. Leave both dates empty to include every saved budget.</p></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="From" hint="Optional"><Input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></Field><Field label="To" hint="Optional"><Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></Field></div>
    <Button variant="quiet" className="mt-5" onClick={downloadBudgetHistory}><Download size={16} />Download budget history CSV</Button>
  </Card>;
}
