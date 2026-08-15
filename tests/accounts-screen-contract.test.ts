import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const accountsScreen = readFileSync(resolve(process.cwd(), "components/finance/accounts-screen.tsx"), "utf8");
const accountDialog = readFileSync(resolve(process.cwd(), "components/finance/account-dialog.tsx"), "utf8");
const ledgerRoute = readFileSync(resolve(process.cwd(), "app/api/ledger/route.ts"), "utf8");

describe("Accounts screen interaction contract", () => {
  it("shows each active account exactly once instead of duplicating cash-reserve summaries", () => {
    expect(accountsScreen).toContain("active.map((account) =>");
    expect(accountsScreen).not.toContain("account-special-collection");
    expect(accountsScreen).not.toContain("special(\"cash_reserve\")");
  });

  it("keeps pencil-only account editing a 44px, keyboard-focusable button above decorative artwork", () => {
    expect(accountsScreen).toContain('type="button" aria-label={`Edit ${account.name}`}');
    expect(accountsScreen).toContain("pointer-events-none absolute right-0 top-0");
    expect(accountsScreen).toContain("grid h-11 w-11 shrink-0 place-items-center");
    expect(accountsScreen).not.toContain("<span>Edit</span>");
    expect(accountsScreen).toContain("setDialog(account)");
  });

  it("keeps name and account type editable, with Cash reserve guidance", () => {
    expect(accountDialog).toContain('value={form.name} onChange=');
    expect(accountDialog).toContain('value={form.type} onChange=');
    expect(accountDialog).toContain('form.type === "cash_reserve"');
    expect(accountDialog).toContain("Cash reserve:</span> money you are setting aside");
    expect(accountDialog).toContain("You can update the account name and type here.");
  });

  it("uses a calm type-derived icon without an editable colour picker or account metadata", () => {
    expect(accountsScreen).toContain("const Icon = iconMap[account.type]");
    expect(accountsScreen).toContain('bg-[var(--raised)] text-[var(--accent)]');
    expect(accountDialog).toContain("A small icon on the account card is chosen automatically from the account type");
    expect(accountDialog).not.toContain('label="Account colour"');
    expect(accountDialog).not.toContain('type="color"');
  });

  it("uses typed archive confirmation and blocks permanent deletion when ledger history exists", () => {
    expect(accountsScreen).toContain('confirmation !== "ARCHIVE"');
    expect(accountsScreen).toContain('Type ARCHIVE to confirm');
    expect(accountsScreen).toContain('Type DELETE to permanently remove this empty account');
    expect(accountsScreen).toContain("transactions.some((transaction) => transaction.account_id === managedAccount.id)");
    expect(ledgerRoute).toContain('case "account.delete"');
    expect(ledgerRoute).toContain("Accounts with transaction history cannot be permanently deleted. Archive this account instead.");
  });

  it("separates archived accounts and restores them through the existing archive-state mutation", () => {
    expect(accountsScreen).toContain('data-finwise-motion="archived-account-collection"');
    expect(accountsScreen).toContain("Archived accounts stay in your financial history");
    expect(accountsScreen).toContain('financeStore.archiveAccount(account.id, false)');
    expect(accountsScreen).toContain(">Restore</Button>");
  });
});
