export type AccountType = "bank" | "cash" | "cash_reserve" | "savings" | "credit_card" | "investment" | "other";
export type TransactionType = "income" | "expense" | "transfer";
export type PaymentMethod = "cash" | "upi" | "debit_card" | "credit_card" | "bank_transfer" | "other";
export type PaymentClassification = "cash" | "online" | "unknown";
export type NeedWantType = "need" | "planned_want" | "impulse";
export type TransferDirection = "in" | "out";
export type ThemePreference = "dark" | "light" | "system";
export type OnboardingStatus = "active" | "dismissed" | "completed";

export interface Profile { id: string; display_name: string | null; }
export interface UserSettings {
  user_id: string; currency: string; emergency_reserve: number; upcoming_commitments: number;
  theme: ThemePreference; small_purchase_threshold: number; onboarding_status: OnboardingStatus;
  budget_watch_enabled: boolean; budget_watch_warning_percent: number; budget_watch_critical_percent: number;
  budget_watch_warning_label: string; budget_watch_warning_color: string;
  budget_watch_critical_label: string; budget_watch_critical_color: string;
  backup_reminder_last_acknowledged_on: string | null;
}
export interface Category { id: string; user_id: string; name: string; icon: string; color: string; is_archived: boolean; }
export interface Account {
  id: string; user_id: string; name: string; type: AccountType; opening_balance: number;
  currency: string; is_archived: boolean; created_at: string;
}
export interface Transaction {
  id: string; user_id: string; account_id: string; category_id: string | null; type: TransactionType;
  transfer_id: string | null; transfer_direction: TransferDirection | null; amount: number; description: string;
  transaction_date: string; payment_method: PaymentMethod | null; need_want: NeedWantType | null;
  notes: string | null; is_recurring: boolean; recurrence_interval: "weekly" | "monthly" | "yearly" | null;
  next_due_date: string | null; created_at: string;
}
export interface RecurringBill {
  id: string; user_id: string; account_id: string; category_id: string | null; name: string; amount: number;
  cadence: "weekly" | "monthly" | "yearly"; next_due_date: string; payment_method: PaymentMethod | null;
  notes: string | null; is_active: boolean; created_at: string; updated_at: string;
}
export interface Receipt {
  id: string; user_id: string; transaction_id: string | null; storage_path: string; file_name: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp"; size_bytes: number; created_at: string;
}
export interface Budget {
  id: string; user_id: string; category_id: string; amount: number; starts_on: string; ends_on: string;
  budget_watch_warning_percent: number | null; budget_watch_critical_percent: number | null;
}
export interface SavingsGoal {
  id: string; user_id: string; name: string; target_amount: number; target_date: string | null;
  color: string; is_archived: boolean; created_at: string;
}
export interface GoalContribution {
  id: string; user_id: string; goal_id: string; amount: number; contribution_date: string; note: string | null;
}

export interface FinanceSnapshot {
  profile: Profile | null; settings: UserSettings | null; accounts: Account[]; categories: Category[];
  transactions: Transaction[]; budgets: Budget[]; goals: SavingsGoal[]; contributions: GoalContribution[];
  recurringBills: RecurringBill[]; receipts: Receipt[];
}

export interface TransactionInput {
  account_id: string; category_id?: string | null; type: Exclude<TransactionType, "transfer">; amount: number;
  description: string; transaction_date: string; payment_method?: PaymentMethod | null;
  need_want?: NeedWantType | null; notes?: string | null; is_recurring?: boolean;
  recurrence_interval?: "weekly" | "monthly" | "yearly" | null; next_due_date?: string | null; receipt_id?: string | null;
}
