"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { financeStore } from "@/lib/finance/store";
import type { FinanceSnapshot } from "@/lib/finance/types";

type FinanceContextValue = FinanceSnapshot & { loading: boolean; error: string | null; configured: boolean; refresh: () => Promise<void>; run: <T>(action: () => Promise<T>, message?: string) => Promise<boolean>; };
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot>(financeStore.emptySnapshot);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();
  const refresh = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    setLoading(true); setError(null);
    try { setSnapshot(await financeStore.refresh()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load your financial workspace."); } finally { setLoading(false); }
  }, [configured]);
  useEffect(() => { void refresh(); }, [refresh]);
  const run = useCallback(async <T,>(action: () => Promise<T>, message?: string) => {
    try { await action(); await refresh(); if (message) toast.success(message); return true; }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "That action could not be completed."); return false; }
  }, [refresh]);
  return <FinanceContext.Provider value={{ ...snapshot, loading, error, configured, refresh, run }}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext); if (!context) throw new Error("useFinance must be used inside FinanceProvider."); return context;
}
