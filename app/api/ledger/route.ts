import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { accountSchema, budgetSchema, goalSchema, transactionSchema, transferSchema } from "@/lib/finance/validation";
import { parseBackup, restoreRows } from "@/lib/finance/import";
import { createClient } from "@/lib/supabase/server";

const id = z.string().uuid();
const bodySchema = z.object({ action: z.string(), data: z.unknown() });

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete this request." }, { status });
}

async function getSession() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Your session has ended. Please sign in again.");
  const { error: workspaceError } = await supabase.rpc("ensure_current_user_workspace");
  if (workspaceError) throw workspaceError;
  return { supabase, user };
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.parse(await request.json());
    const { supabase, user } = await getSession();
    const action = parsed.action;
    const data = parsed.data as Record<string, unknown>;
    let result: { error: { message: string } | null };

    switch (action) {
      case "account.save": {
        const input = accountSchema.parse(data.input);
        const recordId = data.id ? id.parse(data.id) : null;
        result = recordId ? await supabase.from("accounts").update(input).eq("id", recordId).eq("user_id", user.id) : await supabase.from("accounts").insert({ ...input, user_id: user.id });
        break;
      }
      case "account.archive":
        result = await supabase.from("accounts").update({ is_archived: z.boolean().parse(data.is_archived) }).eq("id", id.parse(data.id)).eq("user_id", user.id);
        break;
      case "account.delete": {
        const accountId = id.parse(data.id);
        const { data: account, error: accountError } = await supabase.from("accounts").select("id").eq("id", accountId).eq("user_id", user.id).maybeSingle();
        if (accountError) throw accountError;
        if (!account) throw new Error("Account not found.");
        const { count, error: historyError } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", accountId);
        if (historyError) throw historyError;
        if ((count ?? 0) > 0) throw new Error("Accounts with transaction history cannot be permanently deleted. Archive this account instead.");
        result = await supabase.from("accounts").delete().eq("id", accountId).eq("user_id", user.id);
        break;
      }
      case "category.save": {
        const input = z.object({ name: z.string().trim().min(1).max(100), icon: z.string().max(32), color: z.string().regex(/^#(?:[A-Fa-f0-9]{6})$/) }).parse(data.input);
        const recordId = data.id ? id.parse(data.id) : null;
        result = recordId ? await supabase.from("categories").update(input).eq("id", recordId) : await supabase.from("categories").insert({ ...input, user_id: user.id });
        break;
      }
      case "transaction.save": {
        const input = transactionSchema.parse(data.input);
        const { data: account, error: accountError } = await supabase.from("accounts").select("type").eq("id", input.account_id).single();
        if (accountError || !account) throw new Error("Choose an active account that belongs to you.");
        if (input.type === "expense" && account.type !== "cash" && !input.payment_method) throw new Error("Select the payment method used for this non-cash account.");
        if (input.type === "expense" && account.type === "cash") input.payment_method = "cash";
        const recordId = data.id ? id.parse(data.id) : null;
        result = recordId ? await supabase.from("transactions").update(input).eq("id", recordId) : await supabase.from("transactions").insert({ ...input, user_id: user.id });
        break;
      }
      case "transaction.delete":
        result = await supabase.from("transactions").delete().eq("id", id.parse(data.id));
        break;
      case "transfer.create": {
        const input = transferSchema.parse(data.input);
        result = await supabase.rpc("create_transfer", { p_source_account: input.source_account_id, p_destination_account: input.destination_account_id, p_amount: input.amount, p_description: input.description, p_transaction_date: input.transaction_date, p_notes: input.notes ?? null });
        break;
      }
      case "budget.save": {
        const input = budgetSchema.parse(data.input);
        const recordId = data.id ? id.parse(data.id) : null;
        result = recordId ? await supabase.from("budgets").update(input).eq("id", recordId) : await supabase.from("budgets").insert({ ...input, user_id: user.id });
        break;
      }
      case "budget.delete":
        result = await supabase.from("budgets").delete().eq("id", id.parse(data.id));
        break;
      case "goal.save": {
        const input = goalSchema.parse(data.input);
        const recordId = data.id ? id.parse(data.id) : null;
        result = recordId ? await supabase.from("savings_goals").update(input).eq("id", recordId) : await supabase.from("savings_goals").insert({ ...input, user_id: user.id });
        break;
      }
      case "goal.delete":
        result = await supabase.from("savings_goals").delete().eq("id", id.parse(data.id));
        break;
      case "goal.contribute":
        result = await supabase.from("goal_contributions").insert({ user_id: user.id, goal_id: id.parse(data.goal_id), amount: z.coerce.number().positive().parse(data.amount), note: z.string().max(2000).optional().parse(data.note) || null });
        break;
      case "settings.update": {
        const input = z.object({ currency: z.string().regex(/^[A-Z]{3}$/).optional(), emergency_reserve: z.coerce.number().min(0).optional(), upcoming_commitments: z.coerce.number().min(0).optional(), small_purchase_threshold: z.coerce.number().min(0).optional(), onboarding_status: z.enum(["active", "dismissed", "completed"]).optional(), budget_watch_enabled: z.boolean().optional(), budget_watch_warning_percent: z.coerce.number().int().min(1).max(99).optional(), budget_watch_critical_percent: z.coerce.number().int().min(2).max(100).optional(), budget_watch_warning_label: z.string().trim().min(1).max(32).optional(), budget_watch_warning_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), budget_watch_critical_label: z.string().trim().min(1).max(32).optional(), budget_watch_critical_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), backup_reminder_last_acknowledged_on: z.string().date().nullable().optional() }).parse(data.input);
        if (input.budget_watch_warning_percent !== undefined || input.budget_watch_critical_percent !== undefined) {
          const { data: current, error: currentError } = await supabase.from("user_settings").select("budget_watch_warning_percent, budget_watch_critical_percent").eq("user_id", user.id).single();
          if (currentError || !current) throw new Error("Unable to read your current budget-watch preferences.");
          const warning = input.budget_watch_warning_percent ?? current.budget_watch_warning_percent;
          const critical = input.budget_watch_critical_percent ?? current.budget_watch_critical_percent;
          if (critical <= warning) throw new Error("The critical budget threshold must be higher than the warning threshold.");
        }
        result = await supabase.from("user_settings").update(input).eq("user_id", user.id);
        break;
      }
      case "profile.update":
        result = await supabase.from("profiles").update({ display_name: z.string().trim().min(1).max(100).parse(data.display_name) }).eq("id", user.id);
        break;
      case "transaction.import": {
        const rows = z.array(transactionSchema).parse(data.rows);
        result = await supabase.from("transactions").insert(rows.map((row) => ({ ...row, user_id: user.id })));
        break;
      }
      case "backup.import": {
        const backup = parseBackup(data.backup);
        const replace = z.boolean().optional().parse(data.replace) ?? false;
        if (replace) for (const table of ["goal_contributions", "savings_goals", "budgets", "transactions", "accounts", "categories"]) {
          const deletion = await supabase.from(table).delete().eq("user_id", user.id);
          if (deletion.error) throw deletion.error;
        }
        for (const [table, rows] of [["categories", backup.categories], ["accounts", backup.accounts], ["transactions", backup.transactions], ["budgets", backup.budgets], ["savings_goals", backup.goals], ["goal_contributions", backup.contributions]] as const) {
          if (!rows.length) continue;
          const insertion = await supabase.from(table).upsert(restoreRows(rows, user.id));
          if (insertion.error) throw insertion.error;
        }
        if (backup.settings) {
          const { user_id: _id, created_at: _created, updated_at: _updated, ...settings } = backup.settings;
          const settingResult = await supabase.from("user_settings").update(settings).eq("user_id", user.id);
          if (settingResult.error) throw settingResult.error;
        }
        result = { error: null };
        break;
      }
      default: return errorResponse(new Error("Unknown finance workflow."), 404);
    }

    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
