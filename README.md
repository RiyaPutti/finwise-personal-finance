# Finwise Personal Finance

Finwise is a dark-first, multi-user personal finance application built with **Next.js**, **TypeScript**, **Tailwind CSS**, **Supabase Auth**, and **PostgreSQL**. It stores financial data in Supabase, derives balances from opening balances and ledger history, and uses PostgreSQL Row Level Security to isolate each user’s records.

> No personal or demo financial data is bundled. A new user begins with an empty ledger and only the generic category catalogue created by the database trigger.

## Requirements

Use Node.js 20.9 or newer, npm, and a Supabase project. The project has been structured to run independently outside any hosted preview environment.

| Command | Purpose |
|---|---|
| `npm install` | Install all application dependencies |
| `npm run dev` | Run local development at `http://localhost:3000` |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run financial-calculation and validation tests |
| `npm run build` | Create the production build |

## Local setup

First clone or download this project, then install its dependencies. Create a `.env.local` file and add your Supabase Project URL, Publishable/anon key, and server-only service-role key from **Project Settings → API**. Do not place the service-role key in a public environment variable.

Create a Supabase project, then open its SQL Editor and run the migrations in ascending filename order: `supabase/migrations/202608140001_initial_schema.sql`, `supabase/migrations/202608140002_default_currency_inr.sql`, `supabase/migrations/202608140003_onboarding_budget_watch.sql`, `supabase/migrations/202608140004_budget_watch_labels.sql`, and `supabase/migrations/202608140005_budget_watch_overrides_backup_reminder.sql`. Together they create the schema, generic category catalogue, indexes, data-integrity functions, Row Level Security policies, INR workspace default, per-user onboarding and budget-watch preferences, presentation labels and color codes, optional per-budget watch overrides, and the in-app backup-reminder acknowledgement field.

In Supabase **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` as a local redirect URL. Configure an OAuth provider such as Google in **Authentication → Providers** if you want the OAuth button enabled. Email/password authentication works when that provider is enabled as well.

```bash
npm install
# Create .env.local with the variables listed in the deployment table below.
npm run dev
```

## Supabase security model

Every user-owned table includes a `user_id` column and has RLS enabled. Policies require `auth.uid()` to equal that column for reads, inserts, changes, and deletes. Transaction and goal-contribution policies also ensure referenced accounts or goals belong to the authenticated user. A database function creates both transfer ledger legs inside one transaction and checks ownership of its source and destination accounts.

The browser uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The server-only `SUPABASE_SERVICE_ROLE_KEY` is used exclusively by `DELETE /api/account`, which derives its deletion target from the verified current session rather than from client-provided user input. No service-role key, database password, JWT secret, Manus credential, or OAuth client secret is included in the source repository.

## Data model and financial logic

Accounts store an opening balance, but never a mutable current balance. Current balances are calculated from opening balance plus income and incoming transfers minus expenses and outgoing transfers. Transfers receive a shared `transfer_id` and are deliberately excluded from spending analytics. Cash reserve and savings accounts are excluded from normal spendable-money calculations until funds are transferred out.

## Money pulse and transaction review

The **Money pulse** screen provides a read-only, 30-day projection of safe-to-spend money. It starts with current spendable account balances, then applies the configured emergency reserve and upcoming commitments before adding only ledger transactions marked recurring with a valid next-due date. It does not invent income, infer bills, create transactions, or alter balances.

The same screen presents a month-to-date **financial pulse** using existing ledger records: spending movement against the prior calendar month, leading and emerging spending categories, and savings/reserve coverage measured against the recent three-month expense average. The **Transaction review** screen is an optional user-initiated queue for uncategorised expenses and note-free category outliers. Selecting an item opens the established transaction editor; changes take effect only when the user saves through the normal validated ledger path.

## Data portability

The Settings screen supports CSV transaction export, a separate **budget history and preferences CSV**, JSON backup, JSON restore, and a CSV template. The budget-history file can optionally be limited to a chosen start and end date; it lists each overlapping saved budget’s period, the selected export period, calculated progress, optional budget-specific thresholds, and current workspace preferences. CSV values are escaped to reduce spreadsheet-formula injection risk. JSON imports are validated before writing. Replace-style JSON restoration requires an explicit in-application confirmation and is designed to operate under the importing user’s RLS session.

## First-run orientation and budget watch

New workspaces open a concise three-step orientation that introduces accounts, budgets, and the personal ledger. A user can complete or dismiss it, and can restart it from Settings at any time. Completion state is stored per user.

The Settings screen also provides a **Monthly budget watch**. Users can enable or disable it, choose a gentle watch threshold and a stronger critical threshold, and optionally customize the in-app tag and hex color for each state. When creating a budget, a user may also choose paired warning and critical thresholds for that budget only; if omitted, the workspace defaults apply. Finwise evaluates active monthly budget progress when the authenticated workspace loads or refreshes, then displays a calm in-app signal for budgets that meet a threshold. These labels, colors, and overrides do not change financial calculations or stored transaction values.

The Settings page displays a deterministic in-app backup reminder when a user has not acknowledged a backup for 30 days. Its **Download JSON backup** action creates a local browser download and records the acknowledgement date for that user. It does **not** send email, run a scheduled job, create background work, or upload data to any other service.

## Vercel deployment

Push the project to a repository you control, import it into Vercel, and configure these environment variables in **Project Settings → Environment Variables**:

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Your Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Your Supabase service-role key, used only for authenticated account deletion |

Add your deployed callback URL as `https://your-domain.com/auth/callback` in Supabase Authentication URL Configuration, deploy from Vercel, and test sign-in, sign-out, the first-run orientation, monthly budget-watch defaults and budget-specific overrides, transactions, transfers, both CSV exports including date ranges, JSON backup reminder downloads, Money pulse forecast and financial-pulse derivations, transaction-review edits, and the typed Delete Account confirmation flow against the deployed URL.

## Project structure

```text
app/                         Next.js routes, protected workspace, auth callback, API route
components/                  Reusable design-system, layout, finance, and chart components
lib/finance/                 Typed calculations, insights, validation, and Supabase data access
lib/supabase/                Browser and server Supabase clients
supabase/migrations/         PostgreSQL schema, RLS policies, functions, and indexes
tests/                       Unit tests for deterministic financial logic
DESIGN_SYSTEM.md             Screen map and design tokens for implementation/Figma alignment
```
