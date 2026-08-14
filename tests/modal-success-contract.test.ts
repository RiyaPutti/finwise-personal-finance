import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const modalFormFiles = [
  "components/finance/account-dialog.tsx",
  "components/finance/transaction-dialog.tsx",
  "components/finance/budget-goal-dialogs.tsx",
];

describe("modal successful-save contract", () => {
  it("returns an explicit true signal only after the provider refreshes finance data", () => {
    const provider = readFileSync(resolve(projectRoot, "components/finance/finance-provider.tsx"), "utf8");
    expect(provider).toContain("await action(); await refresh();");
    expect(provider).toContain("return true;");
    expect(provider).toContain("return false;");
  });

  it.each(modalFormFiles)("closes %s only after the explicit success signal", (relativePath) => {
    const modal = readFileSync(resolve(projectRoot, relativePath), "utf8");
    expect(modal).toContain("if (result) onClose()");
    expect(modal).not.toContain("result !== undefined");
  });
});
