import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/finance/overview-screen.tsx", "utf8");
const rootSource = readFileSync("app/page.tsx", "utf8");

describe("Overview Safe to Spend explanation contract", () => {
  it("explains the ledger-derived online and total safe-to-spend formulas in accessible tooltips", () => {
    expect(source).toContain('aria-label={`Explain ${label}`}');
    expect(source).toContain("UPI / online Safe to Spend = max(0, active Bank and Other account balances");
    expect(source).toContain("Total Safe to Spend = UPI / online Safe to Spend + active Cash Wallet balances");
    expect(source).toContain('label="UPI / online safe"');
    expect(source).toContain('label="Total safe to spend"');
    expect(source).toContain("tooltip={onlineSafeToSpendFormula}");
    expect(source).toContain("tooltip={totalSafeToSpendFormula}");
  });

  it("exposes an in-app-only reserve shortfall warning and ledger-derived progress chart", () => {
    expect(source).toContain('role="status" aria-live="polite"');
    expect(source).toContain("Emergency reserve is below your target");
    expect(source).toContain("This is an in-app signal only; it does not move money or create a transfer.");
    expect(source).toContain("Emergency reserve target covered");
    expect(source).toContain('href="/app/settings">Edit target</Link>');
    expect(source).toContain("Emergency reserve progress");
    expect(source).toContain("<ReserveProgressChart");
    expect(source).toContain("can evolve with real-user feedback");
  });

  it("shows a distinct ledger-derived online-versus-cash trend without treating reserves as spending money", () => {
    expect(source).toContain("UPI / online and cash balance");
    expect(source).toContain("<OnlineCashBalanceChart");
    expect(source).toContain("Cash Reserve, Savings, Investments, and Credit cards remain excluded");
    expect(source).toContain("reserve and commitment guardrails stay in today’s Safe to Spend figures");
  });

  it("keeps the payment split transparent and the preferred everyday account device-private", () => {
    expect(source).toContain("UPI / online vs cash spending");
    expect(source).toContain("Expense entries only. A missing payment method stays unclassified");
    expect(source).toContain("Preferred everyday account");
    expect(source).toContain("Saved only on this device");
    expect(source).toContain("does not route payments or change balances");
    expect(source).toContain("This is a planning signal only; it does not move money or block a transaction.");
  });

  it("personalizes the authenticated workspace homepage while retaining a fallback greeting", () => {
    expect(source).toContain("const firstName = profile?.display_name?.trim().split(/\\s+/)[0] || null;");
    expect(source).toContain('firstName ? `Welcome back, ${firstName}.` : "A clearer view of today."');
  });

  it("preserves the root route into the authenticated workspace homepage", () => {
    expect(rootSource).toContain('redirect("/app/overview")');
  });
});
