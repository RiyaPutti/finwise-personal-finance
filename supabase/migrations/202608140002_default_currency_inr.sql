-- Changes the default only for workspaces and accounts created after this migration.
-- Existing users retain their saved currency preference unchanged.
alter table public.user_settings alter column currency set default 'INR';
alter table public.accounts alter column currency set default 'INR';
