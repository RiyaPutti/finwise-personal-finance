import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(resolve(root, "supabase/migrations/202608140005_budget_watch_overrides_backup_reminder.sql"), "utf8");
const ledger = readFileSync(resolve(root, "app/api/ledger/route.ts"), "utf8");
const exportRoute = readFileSync(resolve(root, "app/api/export/route.ts"), "utf8");
const exportCard = readFileSync(resolve(root, "components/finance/budget-history-export-card.tsx"), "utf8");
const budgetDialog = readFileSync(resolve(root, "components/finance/budget-goal-dialogs.tsx"), "utf8");
const backupCard = readFileSync(resolve(root, "components/finance/backup-reminder-card.tsx"), "utf8");
const calculations = readFileSync(resolve(root, "lib/finance/calculations.ts"), "utf8");

describe("budget-watch overrides, filtered export, and backup reminder contracts", () => {
  it("persists optional paired per-budget thresholds and a user-local reminder acknowledgement", () => {
    expect(migration).toContain("budget_watch_warning_percent");
    expect(migration).toContain("budget_watch_critical_percent");
    expect(migration).toContain("budget_watch_critical_percent > budget_watch_warning_percent");
    expect(migration).toContain("backup_reminder_last_acknowledged_on");
    expect(ledger).toContain("backup_reminder_last_acknowledged_on");
    expect(ledger).toContain('case "budget.save"');
  });

  it("provides a validated date-range budget export without relaxing authenticated CSV handling", () => {
    expect(exportRoute).toContain('searchParams.get("start")');
    expect(exportRoute).toContain('searchParams.get("end")');
    expect(exportRoute).toContain("Choose both valid export dates");
    expect(exportRoute).toContain("export_period_start");
    expect(exportCard).toContain('type="date"');
    expect(exportCard).toContain("Choose both export dates");
  });

  it("keeps threshold overrides and the backup reminder deterministic and user initiated", () => {
    expect(budgetDialog).toContain("Use custom budget-watch thresholds");
    expect(budgetDialog).toContain("Overrides your workspace watch thresholds");
    expect(calculations).toContain("budget.budget_watch_warning_percent ?? settings?.budget_watch_warning_percent");
    expect(calculations).toContain("backupReminderDue");
    expect(backupCard).toContain("Download JSON backup");
    expect(backupCard).toContain("no backup is created or sent automatically");
    expect(backupCard).not.toContain("setInterval");
    expect(backupCard).not.toContain("fetch(");
  });
});
