import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/finance/overview-screen.tsx", "utf8");

describe("Overview Safe to Spend explanation contract", () => {
  it("exposes the exact ledger-derived formula in an accessible tooltip", () => {
    expect(source).toContain('aria-label={`Explain ${label}`}');
    expect(source).toContain("Safe to Spend = max(0, active account balances excluding Cash reserve, Savings, Investments, and Credit cards");
    expect(source).toContain("tooltip={safeToSpendFormula}");
  });
});
