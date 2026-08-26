-- User-managed bill plans supplement, but never alter, the recorded ledger.
create table if not exists public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0),
  cadence text not null check (cadence in ('weekly', 'monthly', 'yearly')),
  next_due_date date not null,
  payment_method text check (payment_method in ('cash', 'upi', 'debit_card', 'credit_card', 'bank_transfer', 'other')),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  storage_path text not null unique,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now()
);

create index if not exists recurring_bills_user_due_idx on public.recurring_bills(user_id, is_active, next_due_date);
create index if not exists receipts_user_created_idx on public.receipts(user_id, created_at desc);

drop trigger if exists set_recurring_bills_updated_at on public.recurring_bills;
create trigger set_recurring_bills_updated_at before update on public.recurring_bills
for each row execute function public.set_updated_at();

alter table public.recurring_bills enable row level security;
alter table public.receipts enable row level security;

drop policy if exists "users_manage_own_recurring_bills" on public.recurring_bills;
create policy "users_manage_own_recurring_bills" on public.recurring_bills
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users_manage_own_receipts" on public.receipts;
create policy "users_manage_own_receipts" on public.receipts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finwise-receipts', 'finwise-receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users_manage_own_finwise_receipts" on storage.objects;
create policy "users_manage_own_finwise_receipts" on storage.objects
for all to authenticated
using (bucket_id = 'finwise-receipts' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'finwise-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
