import { describe, expect, it } from "vitest";
import { parseBackup, restoreRows } from "@/lib/finance/import";
import { accountSchema, transactionSchema, transferSchema } from "@/lib/finance/validation";

describe("finance input validation", () => {
  it("accepts a valid account and rejects malformed currency codes", () => {
    expect(accountSchema.parse({ name: "Daily cash", type: "cash", opening_balance: 25, currency: "USD" })).toMatchObject({ type: "cash", currency: "USD" });
    expect(() => accountSchema.parse({ name: "Daily cash", type: "cash", opening_balance: 25, currency: "usd" })).toThrow("three-letter currency");
  });

  it("requires positive ledger amounts and two distinct transfer accounts", () => {
    expect(() => transactionSchema.parse({ account_id: crypto.randomUUID(), type: "expense", amount: 0, description: "Coffee", transaction_date: "2026-08-14" })).toThrow("greater than zero");
    const account = crypto.randomUUID();
    expect(() => transferSchema.parse({ source_account_id: account, destination_account_id: account, amount: 10, description: "Move funds", transaction_date: "2026-08-14" })).toThrow("different accounts");
  });
});

describe("backup transformation", () => {
  it("normalizes a valid backup, removes foreign ownership metadata, and applies the current owner", () => {
    const backup = parseBackup(JSON.stringify({ accounts: [{ id: "old-id", user_id: "other-user", created_at: "2020-01-01", name: "Bank" }], categories: [], transactions: [] }));
    expect(restoreRows(backup.accounts, "current-user")).toEqual([{ id: "old-id", name: "Bank", user_id: "current-user" }]);
  });

  it("rejects malformed JSON before any restoration request can be sent", () => {
    expect(() => parseBackup("{invalid json")).toThrow("not valid JSON");
  });
});
