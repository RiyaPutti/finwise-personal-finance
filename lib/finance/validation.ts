import { z } from "zod";

const money = z.coerce.number().positive("Enter an amount greater than zero.");
export const accountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required.").max(100),
  type: z.enum(["bank", "cash", "cash_reserve", "savings", "credit_card", "investment", "other"]),
  opening_balance: z.coerce.number(), currency: z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
});
export const transactionSchema = z.object({
  account_id: z.string().uuid("Choose an account."), category_id: z.string().uuid().nullable().optional(),
  type: z.enum(["income", "expense"]), amount: money, description: z.string().trim().min(1, "Description is required.").max(240),
  transaction_date: z.string().date(), payment_method: z.enum(["cash", "upi", "debit_card", "credit_card", "bank_transfer", "other"]).nullable().optional(),
  need_want: z.enum(["need", "planned_want", "impulse"]).nullable().optional(), notes: z.string().max(2000).nullable().optional(),
  is_recurring: z.boolean().optional(), recurrence_interval: z.enum(["weekly", "monthly", "yearly"]).nullable().optional(), next_due_date: z.string().date().nullable().optional(),
});
export const transferSchema = z.object({
  source_account_id: z.string().uuid(), destination_account_id: z.string().uuid(), amount: money,
  description: z.string().trim().min(1).max(240), transaction_date: z.string().date(), notes: z.string().max(2000).nullable().optional(),
}).refine((value) => value.source_account_id !== value.destination_account_id, { message: "Choose two different accounts.", path: ["destination_account_id"] });
export const budgetSchema = z.object({ category_id: z.string().uuid(), amount: money, starts_on: z.string().date(), ends_on: z.string().date(), budget_watch_warning_percent: z.coerce.number().int().min(1).max(99).nullable().optional(), budget_watch_critical_percent: z.coerce.number().int().min(2).max(100).nullable().optional() }).refine((value) => value.ends_on >= value.starts_on, { message: "End date must follow the start date.", path: ["ends_on"] }).refine((value) => (value.budget_watch_warning_percent === null || value.budget_watch_warning_percent === undefined) === (value.budget_watch_critical_percent === null || value.budget_watch_critical_percent === undefined), { message: "Set both custom budget-watch thresholds or leave both empty.", path: ["budget_watch_critical_percent"] }).refine((value) => value.budget_watch_warning_percent === null || value.budget_watch_warning_percent === undefined || value.budget_watch_critical_percent === null || value.budget_watch_critical_percent === undefined || value.budget_watch_critical_percent > value.budget_watch_warning_percent, { message: "The custom critical threshold must be higher than the warning threshold.", path: ["budget_watch_critical_percent"] });
export const goalSchema = z.object({ name: z.string().trim().min(1).max(120), target_amount: money, target_date: z.string().date().nullable().optional(), color: z.string().regex(/^#(?:[A-Fa-f0-9]{6})$/) });
