-- Optional per-budget thresholds retain the user's workspace defaults when both values are null.
alter table public.budgets
  add column if not exists budget_watch_warning_percent integer,
  add column if not exists budget_watch_critical_percent integer;

alter table public.budgets
  drop constraint if exists budgets_budget_watch_thresholds_check,
  add constraint budgets_budget_watch_thresholds_check check (
    (budget_watch_warning_percent is null and budget_watch_critical_percent is null)
    or (
      budget_watch_warning_percent between 1 and 99
      and budget_watch_critical_percent between 2 and 100
      and budget_watch_critical_percent > budget_watch_warning_percent
    )
  );

-- This date powers a deterministic Settings reminder only; it does not schedule or send work.
alter table public.user_settings
  add column if not exists backup_reminder_last_acknowledged_on date;
