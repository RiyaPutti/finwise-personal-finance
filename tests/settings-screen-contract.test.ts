import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/finance/planning-settings-screens.tsx", "utf8");

describe("Settings screen persistence contract", () => {
  it("rehydrates editable fields from the persisted settings snapshot after refresh", () => {
    expect(source).toContain("useEffect(() => { if (!settings) return;");
    expect(source).toContain("setReserve(String(settings.emergency_reserve))");
    expect(source).toContain("setCommitments(String(settings.upcoming_commitments))");
    expect(source).toContain("setThreshold(String(settings.small_purchase_threshold))");
  });

  it("explains the emergency-reserve Safe to Spend rule and keeps the theme select controlled", () => {
    expect(source).toContain("Safe to Spend subtracts this target and upcoming commitments");
    expect(source).toContain("<Select value={themePreference}");
  });

  it("shows reserve coverage from active Cash reserve accounts without persisting a presentation setting", () => {
    expect(source).toContain("deriveAccountBalances(accounts, transactions)");
    expect(source).toContain('account.type === "cash_reserve"');
    expect(source).toContain("Reserve coverage");
    expect(source).toContain("held in Cash reserve accounts");
  });
});
