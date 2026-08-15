"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, ChartNoAxesCombined, CircleDollarSign, Goal, Landmark, LayoutDashboard, ListChecks, Menu, Plus, Settings2, Sparkles, WalletCards } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { FinwiseLogo } from "@/components/branding/finwise-logo";
import { Modal } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const navigation = [
  ["overview", "Overview", LayoutDashboard], ["pulse", "Money pulse", Sparkles], ["accounts", "Accounts", Landmark], ["transactions", "Transactions", WalletCards], ["review", "Review transactions", ListChecks],
  ["spend", "Spend analysis", ChartNoAxesCombined], ["calendar", "Calendar", CalendarDays], ["budgets", "Budgets", CircleDollarSign],
  ["goals", "Savings goals", Goal], ["reports", "Reports", BarChart3], ["settings", "Settings", Settings2],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [transactionOpen, setTransactionOpen] = useState(false); const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]"><aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--line)] bg-[var(--sidebar)] px-3 py-5 lg:flex lg:flex-col"><Link href="/app/overview" className="mb-8 px-2"><FinwiseLogo showTagline /></Link><nav className="grid gap-1">{navigation.map(([slug, label, Icon]) => { const active = path === `/app/${slug}`; return <Link key={slug} href={`/app/${slug}`} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-[var(--raised)] text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--ink)]")}><Icon size={17} strokeWidth={active ? 2 : 1.7} />{label}</Link>; })}</nav><div className="mt-auto flex items-center justify-between px-2"><span className="text-xs text-[var(--muted)]">Your data, your view</span><ThemeToggle /></div></aside><main className="pb-24 lg:ml-64 lg:pb-8"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--canvas)]/85 px-4 backdrop-blur-xl lg:px-8"><p className="text-xs font-medium uppercase tracking-[.18em] text-[var(--muted)]">Financial workspace</p><div className="flex items-center gap-2"><SignOutButton /><div className="lg:hidden"><ThemeToggle /></div><Button size="sm" onClick={() => setTransactionOpen(true)}><Plus size={16} />Add transaction</Button></div></header><div className="finwise-reveal mx-auto max-w-[1480px] px-4 py-6 lg:px-8 lg:py-8">{children}</div></main><nav className="fixed inset-x-0 bottom-0 z-30 flex h-[68px] items-center justify-around border-t border-[var(--line)] bg-[var(--sidebar)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">{navigation.slice(0, 4).map(([slug, label, Icon]) => { const active = path === `/app/${slug}`; return <Link key={slug} href={`/app/${slug}`} className={cn("flex min-w-11 flex-col items-center gap-1 text-[10px]", active ? "text-[var(--accent)]" : "text-[var(--muted)]")}><Icon size={18} />{label.split(" ")[0]}</Link>; })}<button type="button" aria-label="Open all sections" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)} className="flex min-w-11 flex-col items-center gap-1 text-[10px] text-[var(--muted)]"><Menu size={18} />More</button></nav><button aria-label="Add transaction" onClick={() => setTransactionOpen(true)} className="fixed bottom-20 right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent)] text-[#151108] shadow-float transition active:scale-95 lg:hidden"><Plus size={24} /></button><Modal open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="All sections"><nav aria-label="All Finwise sections" className="grid gap-1">{navigation.map(([slug, label, Icon]) => { const active = path === `/app/${slug}`; return <Link key={slug} href={`/app/${slug}`} onClick={() => setMobileNavOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition", active ? "bg-[var(--raised)] text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--ink)]")}><Icon size={18} strokeWidth={active ? 2 : 1.7} />{label}</Link>; })}</nav></Modal><TransactionDialog open={transactionOpen} onClose={() => setTransactionOpen(false)} /></div>;
}
