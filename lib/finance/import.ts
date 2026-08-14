import { z } from "zod";

const records = z.array(z.record(z.string(), z.unknown()));

export const backupSchema = z.object({
  accounts: records.default([]),
  categories: records.default([]),
  transactions: records.default([]),
  budgets: records.default([]),
  goals: records.default([]),
  contributions: records.default([]),
  settings: z.record(z.string(), z.unknown()).nullable().optional(),
  profile: z.record(z.string(), z.unknown()).nullable().optional(),
}).passthrough();

export type ValidBackup = z.infer<typeof backupSchema>;

export function parseBackup(raw: unknown): ValidBackup {
  let candidate = raw;
  if (typeof raw === "string") {
    try { candidate = JSON.parse(raw); } catch { throw new Error("The backup file is not valid JSON."); }
  }
  const parsed = backupSchema.safeParse(candidate);
  if (!parsed.success) throw new Error("This backup does not contain a valid Finwise data structure.");
  return parsed.data;
}

export function restoreRows(records: Record<string, unknown>[], userId: string) {
  return records.map((record) => {
    const { user_id: _owner, created_at: _created, updated_at: _updated, ...row } = record;
    return { ...row, user_id: userId };
  });
}
