import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(resolve(root, "supabase/migrations/202608140003_onboarding_budget_watch.sql"), "utf8");
const route = readFileSync(resolve(root, "app/api/ledger/route.ts"), "utf8");
const onboarding = readFileSync(resolve(root, "components/finance/onboarding-flow.tsx"), "utf8");
const watchBanner = readFileSync(resolve(root, "components/finance/budget-watch-banner.tsx"), "utf8");
const preferences = readFileSync(resolve(root, "components/finance/workspace-preferences-cards.tsx"), "utf8");

describe("onboarding and monthly budget watch contracts", () => {
  it("adds backward-compatible per-user preference columns with valid watch defaults", () => {
    expect(migration).toContain("onboarding_status");
    expect(migration).toContain("budget_watch_enabled");
    expect(migration).toContain("budget_watch_warning_percent");
    expect(migration).toContain("budget_watch_critical_percent");
    expect(migration).toContain("budget_watch_warning_percent between 1 and 99");
    expect(migration).toContain("budget_watch_critical_percent > budget_watch_warning_percent");
  });

  it("validates update payloads and prevents an invalid threshold order", () => {
    expect(route).toContain('z.enum(["active", "dismissed", "completed"])');
    expect(route).toContain("budget_watch_warning_percent");
    expect(route).toContain("budget_watch_critical_percent");
    expect(route).toContain("critical <= warning");
  });

  it("keeps onboarding and alert preferences in-app and free of timer-driven delivery", () => {
    expect(onboarding).toContain("financeStore.updateSettings({ onboarding_status: status })");
    expect(preferences).toContain("financeStore.updateSettings({ budget_watch_enabled: enabled");
    expect(watchBanner).toContain("activeBudgetWatchAlerts");
    const featureSource = [onboarding, watchBanner, preferences].join("\n");
    expect(featureSource).not.toContain("setInterval(");
    expect(featureSource).not.toContain("setTimeout(");
    expect(featureSource).not.toContain("manus-heartbeat");
  });
});
