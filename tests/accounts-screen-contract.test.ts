import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const accountsScreen = readFileSync(resolve(process.cwd(), "components/finance/accounts-screen.tsx"), "utf8");
const accountDialog = readFileSync(resolve(process.cwd(), "components/finance/account-dialog.tsx"), "utf8");

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

  it("keeps both name and account type editable and explains the Cash reserve choice", () => {
    expect(accountDialog).toContain('value={form.name} onChange=');
    expect(accountDialog).toContain('value={form.type} onChange=');
    expect(accountDialog).toContain('form.type === "cash_reserve"');
    expect(accountDialog).toContain("Cash reserve:</span> money you are setting aside");
    expect(accountDialog).toContain("You can update the account name and type here.");
  });
});
