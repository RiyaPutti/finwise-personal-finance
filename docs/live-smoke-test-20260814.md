# Live Finwise Smoke-Test Notes

- Target: `https://finwise-money.vercel.app/auth?next=%2Fapp%2Foverview`
- The public authentication route loaded without a visible deployment error.
- The authorized test account authenticated successfully and reached the authenticated workspace.
- The workspace navigation exposed **Money pulse** and **Review transactions** routes.
- The first-run onboarding overlay appeared after sign-in. It was not dismissed or advanced to avoid altering production user settings.
- No financial data, preferences, exports, or account records were changed during this test.
- The authenticated **Money pulse** route rendered successfully. For this empty workspace, it showed the expected account-first state rather than simulated forecast data.
- The authenticated **Review transactions** route rendered successfully. It showed a zero-item state and described that no transaction changes occur until a user explicitly opens, edits, and saves an item.

## Authorized synthetic end-to-end test setup

- The user authorized clearly synthetic production records and stated that the test user will be removed afterward.
- A single bank account named `E2E Synthetic Checking` with a ₹50,000.00 opening balance was created.
- A recurring ₹80,000.00 income record named `E2E Synthetic Salary` was prepared with a monthly repeat and a 2026-08-28 next-due date; its note explicitly identifies it as synthetic test data.
- The transaction save control was invoked; confirming persistence is part of the continuing end-to-end test.

## Synthetic ledger confirmation and recurring-expense setup

- The account balance updated to ₹130,000.00 after saving `E2E Synthetic Salary`, confirming the recurring ₹80,000.00 income record persisted.
- A second synthetic record, `E2E Synthetic Rent`, is being configured as a ₹15,000.00 monthly Rent expense using UPI and an explicit synthetic-data note.
- The native date input did not accept the browser text-entry format cleanly for the rent next-due field; the value requires a controlled correction before the record is saved.

## Synthetic recurring expense confirmation

- The rent next-due value was corrected to 2026-08-20 through the native control before submission.
- `E2E Synthetic Rent` persisted successfully: the synthetic checking balance moved from ₹130,000.00 to ₹115,000.00, matching the ₹15,000.00 expense.

## Transaction-review fixture attempt

- A clearly synthetic ₹30,000 uncategorized expense was entered with an explicit synthetic-data note and UPI payment method.
- The first submission attempt left the transaction dialog open; the next step is to inspect the live validation response before treating the record as persisted.

## Money Pulse populated-state verification

- The synthetic uncategorized ₹30,000 expense persisted successfully; the checking-account balance is ₹85,000.00.
- Live route checked: `https://finwise-money.vercel.app/app/pulse`.
- The Money Pulse screen rendered a populated 30-day forecast with two scheduled recurring items, a starting safe-to-spend amount of ₹85,000.00, and a projected ₹150,000.00 balance.
- Financial Pulse rendered populated month-to-date spending (₹45,000.00), the leading uncategorized category (₹30,000.00), reserve coverage, and plain-language attention guidance. No records were altered by visiting the screen.

## Transaction Review populated-state verification

- Live route checked: `https://finwise-money.vercel.app/app/review`.
- The queue rendered one synthetic record, `E2E Synthetic Uncategorised Review`, flagged as needing a category.
- Selecting **Review** opened the existing transaction editor with the original synthetic amount, account, date, UPI method, and explicit test-data note intact.
- Next authorized action: assign a category and save to verify the queue resolution path.

## Transaction Review resolution attempt

- Assigned the synthetic review item to the existing **Rent** category and invoked **Save changes**.
- The editor remained open immediately after the save invocation, so the resolution outcome still requires a live-state refresh before it can be marked as passed or failed.

## Transaction Review resolution result and populated Overview

- A refresh confirmed the category save succeeded: Transaction Review now reports **0 items to review** and shows its resolved empty state.
- Live Overview checked: `https://finwise-money.vercel.app/app/overview`.
- The dashboard rendered the synthetic ledger totals consistently: total balance and safe to spend of **₹85,000.00**, monthly income of **₹80,000.00**, and monthly outflow of **₹45,000.00**.
- Recent activity contained the three labeled synthetic entries, including the formerly uncategorized item now shown under **Rent**.

## Budget workflow setup

- Live Budgets route loaded correctly in its empty state and exposed the **Set budget** action.
- The opened form offers a category, amount, date range, and optional **Use custom budget-watch thresholds** toggle, confirming the configured per-budget override path is reachable.
- Selected the synthetic **Rent** category and entered a deliberately low test budget amount of `10000` for the August 2026 period, intended to exercise populated progress and watch states against the synthetic rent expense.
- Enabled the per-budget override controls and entered clearly distinct synthetic thresholds: warning `55%`, critical `70%`.
- Budget creation succeeded. The Budgets screen renders Rent at `₹45,000.00` spent against `₹10,000.00`, marks it `₹35,000.00 over` at `100%`, and displays the deterministic critical in-app banner: “Critical: your budget watch needs attention.”

## Live Settings validation

- URL tested: `https://finwise-money.vercel.app/app/settings`
- The populated Settings screen loaded without a visible error and retained the active critical budget-watch banner.
- Verified available, non-destructive entry points: transaction CSV export, JSON backup download, CSV template download, optional date range for budget-history CSV, budget-watch tag/color fields, and the in-app “Remind me next month” backup reminder control.
- The destructive backup replacement and account-deletion controls were visible but intentionally not used.
- Triggered the budget-history CSV export with no date filter. The Settings control remained error-free, but the managed browser download history did not list a completed file; this should be rechecked in a normal user browser before treating download persistence as fully verified.
- Triggered “Remind me next month” in the deterministic in-app backup card. The control remained error-free and did not initiate any download, external notification, or scheduled-job prompt; the browser did not expose a visible persisted confirmation state.
- Opened Savings Goals and configured a clearly synthetic goal named “Synthetic E2E Reserve Goal” with a target of ₹30,000. The goal form clearly states that contributions track progress and do not silently move money between accounts.
- Created the synthetic savings goal successfully. The populated card rendered “Synthetic E2E Reserve Goal” with ₹0.00 of ₹30,000.00, 0% progress, and an “Add contribution” action.

## Savings-goal contribution submission

- Entered a clearly synthetic contribution of ₹1,500.00 with the note “Synthetic E2E contribution” for the synthetic reserve goal.
- Invoked the live save control once; the dialog remained open with its values retained, so persistence still requires confirmation.
- A live refresh confirmed persistence: the goal now shows ₹1,500.00 of ₹30,000.00, ₹28,500.00 remaining, and 5% progress. The contribution dialog closed automatically.

## Populated analytics verification

- Spend analysis rendered 2 synthetic expenses totaling ₹45,000.00, with Rent as the top category and a separate ₹45,000.00 explicitly-online classification; Cash and Unknown remained ₹0.00.
- Monthly reports rendered August 2026 with ₹80,000.00 synthetic income, ₹45,000.00 synthetic expenses, ₹0.00 transfers, and a ₹35,000.00 net movement. The income-versus-spending and category charts rendered without error.
- Calendar rendered the August 14 synthetic spend total and, after selecting the day, showed the three matching ledger entries with their expected account, category, and signed amounts.
- Accounts: created the synthetic `E2E Synthetic Cash Wallet` (Cash wallet, ₹0 opening balance). The account form closed automatically after the successful save, the Accounts view refreshed, and the cash-wallet guidance card rendered with the expected ₹0.00 balance.
- Internal transfer: after the user confirmed the live action, recorded a clearly labeled synthetic ₹5,000.00 transfer from `E2E Synthetic Checking` to `E2E Synthetic Cash Wallet`. The transfer form closed automatically and refreshed the account cards. The checking balance decreased from ₹85,000.00 to ₹80,000.00, while the cash-wallet balance increased from ₹0.00 to ₹5,000.00, preserving the combined ₹85,000.00 total.
- Transfer analytics check: the August 2026 Reports screen shows **Transfers ₹5,000.00** separately while retaining **Total expenses ₹45,000.00** and **Net movement ₹35,000.00**. This confirms that the internal transfer was not folded into spending.

## Export download verification

- Triggered **Export transactions CSV** from Settings. The app showed the success toast “CSV exported.” and the browser download history confirms `finwise-transactions-2026-08-14.csv` was saved from the live Finwise domain.
- Triggered **Download JSON backup** from Settings. The browser download history confirms `finwise-backup-2026-08-14.json` was saved from the live Finwise domain.
- Triggered **Download CSV template** from Settings. The browser download history confirms `finwise-import-template.csv` was saved from the live Finwise domain.
- Triggered **Download budget history CSV** with no date filters. Unlike the other export controls, no corresponding file appeared in the browser download history during this test. A read-only authenticated response check confirmed the endpoint itself returns **HTTP 200**, `text/csv; charset=utf-8`, an `attachment; filename=finwise-budget-history-and-preferences.csv` disposition, and a non-empty 1,583-character CSV payload. The remaining issue is therefore limited to the browser-triggered download observation; no financial data was altered.

## Export diagnosis and final live-test verdict

- A read-only browser verification using the same authenticated endpoint and a **1.5-second delayed** object-URL cleanup successfully created `finwise-budget-history-browser-verification.csv` in browser download history. This isolates the observed live issue to the current client-side timing in the budget-history download control, which revokes its object URL immediately after `link.click()`. This is a low-risk client-side portability defect rather than an API, data, RLS, or financial-calculation failure.
- The live test has otherwise passed across authentication, populated overview, accounts, transactions, transaction review and resolution, Money Pulse, Financial Pulse, spend analysis, calendar drill-down, budgets and budget-watch preferences, savings goals and contributions, settings, transaction CSV, JSON backup, CSV template, and internal transfers.
- **Approved correction status:** the source now delays object-URL cleanup by 1.5 seconds after download initiation, with a focused regression assertion. Typecheck, all 40 tests, and the production build passed. Because the user has not yet authorized a GitHub push that would trigger Vercel auto-deployment, the final live browser confirmation for the corrected code remains pending.
- The user remains responsible for deleting the authorized synthetic user and all synthetic records once review is complete.
