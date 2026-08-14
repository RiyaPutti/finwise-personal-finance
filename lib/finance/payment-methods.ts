import type { AccountType, PaymentClassification, PaymentMethod } from "./types";

export const paymentMethods = ["cash", "upi", "debit_card", "credit_card", "bank_transfer", "other"] as const satisfies readonly PaymentMethod[];

export function classifyPaymentMethod(method: PaymentMethod | null | undefined): PaymentClassification {
  if (method === "cash") return "cash";
  if (method) return "online";
  return "unknown";
}

export function defaultPaymentMethodForAccount(accountType: AccountType | undefined, lastUsed?: PaymentMethod | null): PaymentMethod | null {
  if (accountType === "cash") return "cash";
  if (lastUsed && lastUsed !== "cash") return lastUsed;
  return accountType === "bank" ? "upi" : null;
}
