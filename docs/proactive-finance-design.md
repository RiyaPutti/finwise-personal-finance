# Proactive Finwise Design

Finwise will remain a private, ledger-first financial workspace. The proactive layer will **interpret recorded financial data and user-entered plans**; it will never silently create transactions, move money, modify balances, or make financial decisions for the user.

| Surface | Purpose | Primary source of truth |
|---|---|---|
| Overview | Financial Weather, Bills Runway, reserve milestones, quiet wins, and short explainable prompts | Ledger, current balances, bill plans, and settings |
| Plan | Recurring bills, income plans, cash-flow calendar, account-linked goals, annual planning, and no-spend boundaries | User-owned planning records plus the ledger |
| Discover | Money Map, monthly review, net-worth history, spending rhythm, leak signals, What Changed, and money moments | Derived account and transaction history plus optional journal notes |
| Transactions | Search, reviewable transaction rules, receipt-assisted drafts, and current transaction history | Ledger plus user-owned rules and receipt metadata |
| Decision Simulator | A temporary proposed purchase view of timing, flexible money, bills, and reserve coverage | Current ledger, plans, and settings; never persisted unless the user records it separately |

## Interaction principles

Every recommendation must state its evidence, such as the upcoming bill dates, recorded category change, or reserve amount used. Rules are opt-in, transparent, and reviewable before they change any draft. Receipt extraction produces a draft only and requires a user review before saving a transaction. Goal links describe how an account balance informs a goal; they do not reserve, transfer, or double-count money.

## Data model boundaries

Existing `transactions` remain the only financial ledger. New user-owned records are limited to: bill plans, transaction rules, goal links, financial journal notes, spending boundaries, and receipt metadata. All records inherit the project’s per-user row-level-security pattern and cascade on user deletion. Receipts are stored in private object storage with only a key and optional metadata in the database.

## Non-goals in this upgrade

This release excludes shared household workspaces, automatic bank sync, automatic transaction posting, external notifications, background jobs, and fabricated financial history.
