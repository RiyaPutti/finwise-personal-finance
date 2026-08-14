-- Per-user onboarding state and deterministic, in-app monthly budget-watch preferences.
-- No scheduled job, external notification, or delivery channel is created by this migration.

alter table public.user_settings
  add column if not exists onboarding_status text not null default 'active'
    check (onboarding_status in ('active', 'dismissed', 'completed')),
  add column if not exists budget_watch_enabled boolean not null default true,
  add column if not exists budget_watch_warning_percent smallint not null default 75
    check (budget_watch_warning_percent between 1 and 99),
  add column if not exists budget_watch_critical_percent smallint not null default 90
    check (budget_watch_critical_percent between 2 and 100);

alter table public.user_settings
  drop constraint if exists user_settings_budget_watch_thresholds_check;

alter table public.user_settings
  add constraint user_settings_budget_watch_thresholds_check
  check (budget_watch_critical_percent > budget_watch_warning_percent);
