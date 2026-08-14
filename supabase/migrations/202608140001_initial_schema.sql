-- Finwise initial schema. Execute in the Supabase SQL editor or with Supabase CLI.
-- Financial balances are derived from opening balances and ledger entries, not stored as mutable totals.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.account_type as enum ('bank', 'cash', 'cash_reserve', 'savings', 'credit_card', 'investment', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.transaction_type as enum ('income', 'expense', 'transfer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('cash', 'upi', 'debit_card', 'credit_card', 'bank_transfer', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.need_want_type as enum ('need', 'planned_want', 'impulse');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.transaction_direction as enum ('in', 'out');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.theme_preference as enum ('dark', 'light', 'system');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  currency char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  emergency_reserve numeric(14, 2) not null default 0 check (emergency_reserve >= 0),
  upcoming_commitments numeric(14, 2) not null default 0 check (upcoming_commitments >= 0),
  theme public.theme_preference not null default 'dark',
  small_purchase_threshold numeric(14, 2) not null default 100 check (small_purchase_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null,
  color text not null,
  sort_order integer not null
);

insert into public.category_templates (name, icon, color, sort_order) values
  ('Food', 'utensils', '#E7B364', 1), ('Groceries', 'shopping-basket', '#8BBE8B', 2),
  ('Transport', 'car-front', '#8BADE8', 3), ('Rent', 'house', '#A99AE8', 4),
  ('Bills', 'receipt-text', '#D49BE8', 5), ('Subscriptions', 'repeat-2', '#6BC9C2', 6),
  ('Shopping', 'shopping-bag', '#F09D8A', 7), ('Personal Care', 'sparkles', '#D8AC82', 8),
  ('Health', 'heart-pulse', '#E98395', 9), ('Education', 'graduation-cap', '#78A7D5', 10),
  ('Family', 'users', '#C5AE78', 11), ('Entertainment', 'clapperboard', '#A987C4', 12),
  ('Other', 'circle-ellipsis', '#8E9991', 13)
on conflict (name) do nothing;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  icon text not null default 'tag',
  color text not null default '#8E9991',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  type public.account_type not null,
  opening_balance numeric(14, 2) not null default 0,
  currency char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  type public.transaction_type not null,
  transfer_id uuid,
  transfer_direction public.transaction_direction,
  amount numeric(14, 2) not null check (amount > 0),
  description text not null check (char_length(description) between 1 and 240),
  transaction_date date not null default current_date,
  payment_method public.payment_method,
  need_want public.need_want_type,
  notes text,
  is_recurring boolean not null default false,
  recurrence_interval text check (recurrence_interval in ('weekly', 'monthly', 'yearly')),
  next_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'transfer' and transfer_id is not null and transfer_direction is not null and category_id is null)
    or (type <> 'transfer' and transfer_id is null and transfer_direction is null)
  ),
  check ((is_recurring = false) or (recurrence_interval is not null and next_due_date is not null))
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date date,
  color text not null default '#BDE66D',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(14, 2) not null check (amount <> 0),
  contribution_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index if not exists transactions_account_date_idx on public.transactions (account_id, transaction_date desc);
create index if not exists transactions_category_date_idx on public.transactions (category_id, transaction_date desc);
create index if not exists transactions_transfer_idx on public.transactions (transfer_id) where transfer_id is not null;
create index if not exists budgets_user_dates_idx on public.budgets (user_id, starts_on, ends_on);
create index if not exists goal_contributions_goal_date_idx on public.goal_contributions (goal_id, contribution_date desc);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists settings_set_updated_at on public.user_settings;
create trigger settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
drop trigger if exists goals_set_updated_at on public.savings_goals;
create trigger goals_set_updated_at before update on public.savings_goals for each row execute function public.set_updated_at();

create or replace function public.create_user_workspace()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  insert into public.categories (user_id, name, icon, color)
    select new.id, name, icon, color from public.category_templates
    on conflict (user_id, name) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_user_workspace();

-- Covers users created before the trigger was installed and is safe to invoke at session start.
create or replace function public.ensure_current_user_workspace()
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  insert into public.profiles (id) values (v_user) on conflict do nothing;
  insert into public.user_settings (user_id) values (v_user) on conflict do nothing;
  insert into public.categories (user_id, name, icon, color)
    select v_user, name, icon, color from public.category_templates
    on conflict (user_id, name) do nothing;
end; $$;

create or replace function public.create_transfer(
  p_source_account uuid,
  p_destination_account uuid,
  p_amount numeric,
  p_description text,
  p_transaction_date date default current_date,
  p_notes text default null
) returns uuid language plpgsql as $$
declare v_transfer_id uuid := gen_random_uuid(); v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_amount <= 0 then raise exception 'Transfer amount must be greater than zero'; end if;
  if p_source_account = p_destination_account then raise exception 'Transfer accounts must differ'; end if;
  if not exists (select 1 from public.accounts where id = p_source_account and user_id = v_user and not is_archived) then raise exception 'Invalid source account'; end if;
  if not exists (select 1 from public.accounts where id = p_destination_account and user_id = v_user and not is_archived) then raise exception 'Invalid destination account'; end if;
  insert into public.transactions (user_id, account_id, type, transfer_id, transfer_direction, amount, description, transaction_date, notes, payment_method)
    values (v_user, p_source_account, 'transfer', v_transfer_id, 'out', p_amount, p_description, p_transaction_date, p_notes, 'bank_transfer'),
           (v_user, p_destination_account, 'transfer', v_transfer_id, 'in', p_amount, p_description, p_transaction_date, p_notes, 'bank_transfer');
  return v_transfer_id;
end; $$;

-- Cash reserves represent money held aside. Their balance can only change through
-- the paired legs written by create_transfer(), never from a direct income/expense row.
create or replace function public.enforce_reserve_transfer_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type <> 'transfer' and exists (
    select 1 from public.accounts where id = new.account_id and type = 'cash_reserve'
  ) then
    raise exception 'Cash reserve movements must be recorded as transfers.';
  end if;
  return new;
end; $$;

drop trigger if exists enforce_reserve_transfer_only on public.transactions;
create trigger enforce_reserve_transfer_only before insert or update on public.transactions
for each row execute procedure public.enforce_reserve_transfer_only();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy "Profiles are private" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "Settings are private" on public.user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Categories are private" on public.categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Accounts are private" on public.accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Transactions are private" on public.transactions for all using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()) and
  (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid()))
);
create policy "Budgets are private" on public.budgets for all using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid())
);
create policy "Goals are private" on public.savings_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Goal contributions are private" on public.goal_contributions for all using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.savings_goals g where g.id = goal_id and g.user_id = auth.uid())
);

grant execute on function public.create_transfer(uuid, uuid, numeric, text, date, text) to authenticated;
grant execute on function public.ensure_current_user_workspace() to authenticated;
