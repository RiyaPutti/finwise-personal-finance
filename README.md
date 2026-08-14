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

First clone or download this project, then install its dependencies. Create a `.env.local` file and add your Supabase Project URL and Publishable/anon key from **Project Settings → API**. Do not place a service role key in a public environment variable.

Create a Supabase project, then open its SQL Editor and run the migration in `supabase/migrations/202608140001_initial_schema.sql`. The migration creates the schema, generic category catalogue, indexes, data-integrity functions, and all Row Level Security policies.

In Supabase **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` as a local redirect URL. Configure an OAuth provider such as Google in **Authentication → Providers** if you want the OAuth button enabled. Email/password authentication works when that provider is enabled as well.

```bash
npm install
# Create .env.local with the variables listed in the deployment table below.
npm run dev
```

## Supabase security model

Every user-owned table includes a `user_id` column and has RLS enabled. Policies require `auth.uid()` to equal that column for reads, inserts, changes, and deletes. Transaction and goal-contribution policies also ensure referenced accounts or goals belong to the authenticated user. A database function creates both transfer ledger legs inside one transaction and checks ownership of its source and destination accounts.

The browser uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Finwise V1 does not require, read, or ship a Supabase service-role key, database password, JWT secret, Manus credential, or OAuth client secret.

## Data model and financial logic

Accounts store an opening balance, but never a mutable current balance. Current balances are calculated from opening balance plus income and incoming transfers minus expenses and outgoing transfers. Transfers receive a shared `transfer_id` and are deliberately excluded from spending analytics. Cash reserve and savings accounts are excluded from normal spendable-money calculations until funds are transferred out.

## Data portability

The Settings screen supports CSV transaction export, JSON backup, JSON restore, and a CSV template. JSON imports are validated before writing. Replace-style JSON restoration requires an explicit in-application confirmation and is designed to operate under the importing user’s RLS session.

## Vercel deployment

Push the project to a repository you control, import it into Vercel, and configure these environment variables in **Project Settings → Environment Variables**:

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Your Supabase publishable/anon key |

Add your deployed callback URL as `https://your-domain.com/auth/callback` in Supabase Authentication URL Configuration, deploy from Vercel, and test sign-in, sign-out, transactions, transfers, and CSV export against the deployed URL.

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
