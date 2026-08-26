import type { Account } from "./types";

const preferredEverydayAccountKey = "finwise:preferred-everyday-account";

/** A preferred account is presentation context only; it never changes account type, balances, or Safe to Spend. */
export function isEligibleEverydayAccount(account: Account) {
  return !account.is_archived && (account.type === "bank" || account.type === "other");
}

export function readPreferredEverydayAccountId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(preferredEverydayAccountKey) ?? "";
}

export function writePreferredEverydayAccountId(accountId: string) {
  if (typeof window === "undefined") return;
  if (accountId) window.localStorage.setItem(preferredEverydayAccountKey, accountId);
  else window.localStorage.removeItem(preferredEverydayAccountKey);
  window.dispatchEvent(new Event("finwise:preferred-everyday-account-change"));
}
