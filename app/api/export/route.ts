import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const [{ data: transactions, error }, { data: accounts }, { data: categories }] = await Promise.all([supabase.from("transactions").select("*").order("transaction_date", { ascending: false }), supabase.from("accounts").select("id,name"), supabase.from("categories").select("id,name")]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.name])); const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const esc = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = ["transaction_date,type,amount,description,account,category,payment_method,need_want,notes", ...(transactions ?? []).filter((item) => item.type !== "transfer").map((item) => [item.transaction_date, item.type, item.amount, item.description, accountNames.get(item.account_id), categoryNames.get(item.category_id), item.payment_method, item.need_want, item.notes].map(esc).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=finwise-transactions.csv` } });
}
