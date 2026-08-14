-- Optional presentation metadata for deterministic, in-app budget-watch states.
-- These fields do not change threshold calculations, budget data, or delivery behavior.

alter table public.user_settings
  add column if not exists budget_watch_warning_label text not null default 'Watch'
    check (char_length(trim(budget_watch_warning_label)) between 1 and 32),
  add column if not exists budget_watch_warning_color text not null default '#B8965A'
    check (budget_watch_warning_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists budget_watch_critical_label text not null default 'Critical'
    check (char_length(trim(budget_watch_critical_label)) between 1 and 32),
  add column if not exists budget_watch_critical_color text not null default '#C06C5D'
    check (budget_watch_critical_color ~ '^#[0-9A-Fa-f]{6}$');
