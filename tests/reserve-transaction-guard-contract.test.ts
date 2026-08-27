import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("Cash Reserve direct-transaction guard", () => {
  it("keeps Cash Reserve out of income and expense entry while retaining it for transfers", () => {
    const dialog = read("components/finance/transaction-dialog.tsx");
    expect(dialog).toContain('activeAccounts.filter((account) => account.type !== "cash_reserve")');
    expect(dialog).toContain("{directTransactionAccounts.map((account)");
    expect(dialog).toContain("Cash Reserve accounts are available only when you move money.");
    expect(dialog).toContain("{activeAccounts.map((account)");
  });

  it("defends the API route and preserves a useful database failure message", () => {
    const route = read("app/api/ledger/route.ts");
    expect(route).toContain('.eq("user_id", user.id).eq("is_archived", false).maybeSingle()');
    expect(route).toContain('if (account.type === "cash_reserve") throw new Error("Cash Reserve money can only be moved with a transfer.");');
    expect(route).toContain('"message" in error');
  });
});
