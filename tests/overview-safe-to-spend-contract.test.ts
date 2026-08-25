import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/finance/overview-screen.tsx", "utf8");
const rootSource = readFileSync("app/page.tsx", "utf8");

describe("Overview Safe to Spend explanation contract", () => {
  it("exposes the exact ledger-derived formula in an accessible tooltip", () => {
    expect(source).toContain('aria-label={`Explain ${label}`}');
    expect(source).toContain("Safe to Spend = max(0, active account balances excluding Cash reserve, Savings, Investments, and Credit cards");
    expect(source).toContain("tooltip={safeToSpendFormula}");
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

  it("personalizes the authenticated workspace homepage while retaining a fallback greeting", () => {
    expect(source).toContain("const firstName = profile?.display_name?.trim().split(/\\s+/)[0] || null;");
    expect(source).toContain('firstName ? `Welcome back, ${firstName}.` : "A clearer view of today."');
  });

  it("preserves the root route into the authenticated workspace homepage", () => {
    expect(rootSource).toContain('redirect("/app/overview")');
  });
});
