"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { FinanceProvider, useFinance } from "./finance-provider";
import { OverviewScreen } from "./overview-screen";
import { AccountsScreen } from "./accounts-screen";
import { TransactionsScreen } from "./transactions-screen";
import { SpendAnalysisScreen, ReportsScreen } from "./analysis-screens";
import { CalendarScreen } from "./calendar-screen";
import { BudgetsScreen, GoalsScreen, SettingsScreen } from "./planning-settings-screens";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AccountDeletionCard } from "./account-deletion-card";
import { OnboardingFlow } from "./onboarding-flow";
import { BudgetWatchBanner } from "./budget-watch-banner";
import { WorkspacePreferencesCards } from "./workspace-preferences-cards";
import { BudgetHistoryExportCard } from "./budget-history-export-card";
import { BackupReminderCard } from "./backup-reminder-card";
import { MoneyPulseScreen } from "./money-pulse-screen";
import { TransactionReviewScreen } from "./transaction-review-screen";

const screens: Record<string, React.ComponentType> = { overview: OverviewScreen, pulse: MoneyPulseScreen, accounts: AccountsScreen, transactions: TransactionsScreen, review: TransactionReviewScreen, spend: SpendAnalysisScreen, calendar: CalendarScreen, budgets: BudgetsScreen, goals: GoalsScreen, reports: ReportsScreen, settings: SettingsScreen };
function WorkspaceContent({ view }: { view: string }) { const router = useRouter(); const { error, configured, loading } = useFinance(); const Screen = screens[view] ?? OverviewScreen; useEffect(() => { if (!screens[view]) router.replace("/app/overview"); }, [view, router]); if (!configured) return <div className="grid min-h-screen place-items-center bg-[var(--canvas)] p-5"><div className="max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-7 shadow-panel"><p className="text-xs font-medium uppercase tracking-[.18em] text-[var(--accent)]">Configuration required</p><h1 className="mt-3 font-display text-2xl font-semibold">Connect your Supabase project.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Add the public Supabase URL and anon key in `.env.local` and restart the development server. See ENVIRONMENT.md for the exact variables.</p></div></div>; if (error && !loading) return <div className="grid min-h-screen place-items-center bg-[var(--canvas)] p-5"><div className="max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-7 shadow-panel"><p className="text-xs font-medium uppercase tracking-[.18em] text-[#f6a18b]">Workspace unavailable</p><h1 className="mt-3 font-display text-2xl font-semibold">We could not load your ledger.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{error}</p><Button className="mt-5" onClick={() => router.refresh()}>Retry</Button><Button variant="ghost" className="mt-2" onClick={() => { void createClient().auth.signOut().then(() => location.assign("/auth")); }}><LogOut size={15} />Sign out</Button></div></div>; return <AppShell><BudgetWatchBanner />{view === "settings" ? <div className="grid gap-7"><Screen /><BackupReminderCard /><BudgetHistoryExportCard /><WorkspacePreferencesCards /><AccountDeletionCard /></div> : <Screen />}{!loading ? <OnboardingFlow /> : null}</AppShell>; }
export function Workspace({ view }: { view: string }) { return <FinanceProvider><WorkspaceContent view={view} /></FinanceProvider>; }
