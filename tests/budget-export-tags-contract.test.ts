import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(resolve(root, "supabase/migrations/202608140004_budget_watch_labels.sql"), "utf8");
const route = readFileSync(resolve(root, "app/api/ledger/route.ts"), "utf8");
const exportRoute = readFileSync(resolve(root, "app/api/export/route.ts"), "utf8");
const onboarding = readFileSync(resolve(root, "components/finance/onboarding-flow.tsx"), "utf8");
const preferences = readFileSync(resolve(root, "components/finance/workspace-preferences-cards.tsx"), "utf8");
const banner = readFileSync(resolve(root, "components/finance/budget-watch-banner.tsx"), "utf8");
const exportCard = readFileSync(resolve(root, "components/finance/budget-history-export-card.tsx"), "utf8");
const store = readFileSync(resolve(root, "lib/finance/store.ts"), "utf8");
const backupImport = readFileSync(resolve(root, "lib/finance/import.ts"), "utf8");

describe("budget export, tags, and onboarding polish contracts", () => {
  it("adds constrained, backward-compatible warning and critical presentation fields", () => {
    expect(migration).toContain("budget_watch_warning_label");
    expect(migration).toContain("budget_watch_warning_color");
    expect(migration).toContain("budget_watch_critical_label");
    expect(migration).toContain("budget_watch_critical_color");
    expect(migration).toContain("^#[0-9A-Fa-f]{6}$");
  });

  it("validates tag and color updates and applies them only to in-app alert presentation", () => {
    expect(route).toContain("budget_watch_warning_label");
    expect(route).toContain("budget_watch_critical_label");
    expect(route).toContain("^#[0-9a-fA-F]{6}$");
    expect(preferences).toContain("validColor");
    expect(banner).toContain("budget_watch_warning_color");
    expect(banner).toContain("budget_watch_critical_color");
  });

  it("offers an authenticated budget-history preferences CSV and accessible onboarding progress", () => {
    expect(exportRoute).toContain('get("scope") === "budget-history"');
    expect(exportRoute).toContain("finwise-budget-history-and-preferences${suffix}.csv");
    expect(exportRoute).toContain("emergency_reserve");
    expect(exportRoute).toContain("onboarding_status");
    expect(exportCard).toContain('new URLSearchParams({ scope: "budget-history" })');
    expect(onboarding).toContain('role="progressbar"');
    expect(onboarding).toContain("Step {step + 1} of {steps.length}");
    expect(onboarding).toContain("finwise-reveal");
    expect(store).toContain('supabase.from("user_settings").select("*")');
    expect(backupImport).toContain("settings: z.record");
    expect(route).toContain('case "backup.import"');
  });
});
