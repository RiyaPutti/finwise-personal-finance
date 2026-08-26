import { describe, expect, it } from "vitest";
import { isEligibleEverydayAccount } from "@/lib/finance/everyday-account";
import type { Account } from "@/lib/finance/types";

const account = (type: Account["type"], is_archived = false): Account => ({
  id: type, user_id: "user", name: type, type, opening_balance: 0, currency: "INR", is_archived, created_at: "2026-08-01",
});

describe("preferred everyday account eligibility", () => {
  it("allows only active Bank and Other accounts without changing their stored classification", () => {
    expect(isEligibleEverydayAccount(account("bank"))).toBe(true);
    expect(isEligibleEverydayAccount(account("other"))).toBe(true);
    expect(isEligibleEverydayAccount(account("cash"))).toBe(false);
    expect(isEligibleEverydayAccount(account("cash_reserve"))).toBe(false);
    expect(isEligibleEverydayAccount(account("savings"))).toBe(false);
    expect(isEligibleEverydayAccount(account("bank", true))).toBe(false);
  });
});
