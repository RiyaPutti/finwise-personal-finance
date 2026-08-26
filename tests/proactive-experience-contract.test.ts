import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = process.cwd();
const source = (relative: string) => readFileSync(resolve(project, relative), "utf8");

describe("proactive Finwise experience contract", () => {
  it("keeps bill planning available from the Plan surface without creating ledger rows", () => {
    const plan = source("components/finance/plan-screen.tsx");
    const calculations = source("lib/finance/calculations.ts");
    expect(plan).toContain("Bills Runway");
    expect(plan).toContain("Plan bill");
    expect(plan).toContain("saveRecurringBill");
    expect(plan).toContain("billRunway");
    expect(calculations).toContain("recurringOccurrences");
    expect(calculations).toContain("recurringBillOccurrences");
    expect(calculations).toContain("never creates ledger rows");
  });

  it("keeps Discover explainable, private where appropriate, and non-destructive", () => {
    const discover = source("components/finance/discover-screen.tsx");
    expect(discover).toContain("Financial weather");
    expect(discover).toContain("Decision simulator");
    expect(discover).toContain("What changed?");
    expect(discover).toContain("Financial journal");
    expect(discover).toContain("window.localStorage");
    expect(discover).toContain("not a transaction");
  });

  it("exposes Plan and Discover while preserving a review-before-save receipt flow", () => {
    const workspace = source("components/finance/workspace.tsx");
    const navigation = source("components/layout/app-shell.tsx");
    const transactions = source("components/finance/transactions-screen.tsx");
    const receiptRoute = source("app/api/receipt-draft/route.ts");
    expect(workspace).toContain("plan");
    expect(workspace).toContain("discover");
    expect(navigation).toContain("Plan");
    expect(navigation).toContain("Discover");
    expect(transactions).toContain("ReceiptDraftDialog");
    expect(receiptRoute).toContain("return NextResponse.json({ draft:");
    expect(receiptRoute).toContain('storage.from("finwise-receipts").upload');
    expect(receiptRoute).toContain('from("receipts").insert');
    expect(receiptRoute).not.toContain('from("transactions")');
  });

  it("keeps transaction search, reviewable rules, and receipt drafting available together", () => {
    const transactions = source("components/finance/transactions-screen.tsx");
    expect(transactions).toContain("Search merchant, note, account, category");
    expect(transactions).toContain("searchable.includes(queryText)");
    expect(transactions).toContain("matching transaction");
    expect(transactions).toContain("Your category rules");
    expect(transactions).toContain("Private to this browser");
    expect(transactions).toContain("ReceiptDraftDialog");
    expect(transactions).toContain("TransactionList transactions={filtered}");
  });

  it("keeps the established ledger available if optional proactive tables are not yet exposed by the Data API", () => {
    const store = source("lib/finance/store.ts");
    const migration = source("supabase/migrations/202608140006_proactive_finance_persistence.sql");
    const correctiveMigration = source("supabase/migrations/202608140007_proactive_persistence_grants.sql");
    expect(store).toContain("optionalPersistenceErrorCodes");
    expect(store).toContain('"42501"');
    expect(store).toContain('"PGRST204"');
    expect(migration).toContain("grant select, insert, update, delete on table public.recurring_bills, public.receipts to authenticated;");
    expect(correctiveMigration).toContain("grant select, insert, update, delete on table public.recurring_bills, public.receipts to authenticated;");
  });
});
