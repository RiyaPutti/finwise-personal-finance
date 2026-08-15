import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const transactionList = readFileSync(resolve(process.cwd(), "components/finance/transaction-list.tsx"), "utf8");

describe("Transfer history counterparty contract", () => {
  it("derives the label account from the paired transfer rather than the current row", () => {
    expect(transactionList).toContain("transactions: allTransactions");
    expect(transactionList).toContain("candidate.id !== transaction.id && candidate.transfer_id === transaction.transfer_id");
    expect(transactionList).toContain("accountName(pairedTransfer.account_id)");
    expect(transactionList).not.toContain('`${transaction.transfer_direction === "in" ? "From" : "To"}: ${accountName(transaction.account_id)}`');
  });

  it("keeps both directions explicit and has a safe fallback for legacy unpaired records", () => {
    expect(transactionList).toContain('transaction.transfer_direction === "in" ? "From" : "To"');
    expect(transactionList).toContain('if (!transaction.transfer_id) return "Linked account"');
    expect(transactionList).toContain('return pairedTransfer ? accountName(pairedTransfer.account_id) : "Linked account"');
  });
});
