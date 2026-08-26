-- Corrective, additive migration for projects where 202608140006 was already applied.
-- This enables signed-in users to reach the two RLS-protected planning tables through
-- Supabase's Data API; RLS remains the row-level enforcement boundary.
grant select, insert, update, delete on table public.recurring_bills, public.receipts to authenticated;
