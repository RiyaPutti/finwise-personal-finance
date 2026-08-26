import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { receiptSchema as receiptMetadataSchema } from "@/lib/finance/validation";

const receiptDraftSchema = {
  type: "json_schema",
  json_schema: {
    name: "receipt_draft",
    strict: true,
    schema: {
      type: "object",
      properties: {
        description: { type: "string" },
        amount: { type: "number" },
        transaction_date: { type: "string" },
        notes: { type: "string" },
      },
      required: ["description", "amount", "transaction_date", "notes"],
      additionalProperties: false,
    },
  },
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a receipt draft." }, { status: 401 });
  const form = await request.formData();
  const receipt = form.get("receipt");
  if (!(receipt instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(receipt.type)) return NextResponse.json({ error: "Choose a JPG, PNG, or WEBP receipt." }, { status: 400 });
  if (receipt.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Receipt images must be 5 MB or smaller." }, { status: 400 });
  const token = process.env.BUILT_IN_FORGE_API_KEY;
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL;
  if (!token || !baseUrl) return NextResponse.json({ error: "Receipt drafting is not available in this environment." }, { status: 503 });
  const image = Buffer.from(await receipt.arrayBuffer()).toString("base64");
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-3-flash-preview",
      messages: [{ role: "system", content: `Extract a transaction draft from a receipt image. Return only information visibly supported by the image. Use ${today} only when the receipt date is missing. If amount is unclear, use 0. Do not infer payment method or a category.` }, { role: "user", content: [{ type: "text", text: "Create a reviewable Finwise receipt draft." }, { type: "image_url", image_url: { url: `data:${receipt.type};base64,${image}` } }] }],
      response_format: receiptDraftSchema,
      max_tokens: 700,
    }),
  });
  if (!response.ok) return NextResponse.json({ error: "We could not read this receipt. You can still add the transaction manually." }, { status: 502 });
  const payload = await response.json();
  try {
    const draft = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
    const extension = receipt.type === "image/jpeg" ? "jpg" : receipt.type.split("/")[1];
    const metadata = receiptMetadataSchema.parse({ storage_path: `${user.id}/${crypto.randomUUID()}.${extension}`, file_name: receipt.name, mime_type: receipt.type, size_bytes: receipt.size });
    const upload = await supabase.storage.from("finwise-receipts").upload(metadata.storage_path, receipt, { contentType: metadata.mime_type, upsert: false });
    if (upload.error) throw upload.error;
    const saved = await supabase.from("receipts").insert({ ...metadata, user_id: user.id }).select("id").single();
    if (saved.error || !saved.data) { await supabase.storage.from("finwise-receipts").remove([metadata.storage_path]); throw saved.error ?? new Error("Unable to save receipt metadata."); }
    return NextResponse.json({ draft: { description: String(draft.description || "Receipt purchase").slice(0, 240), amount: Number.isFinite(draft.amount) ? Math.max(0, draft.amount) : 0, transaction_date: /^\d{4}-\d{2}-\d{2}$/.test(draft.transaction_date) ? draft.transaction_date : today, notes: String(draft.notes || "").slice(0, 800), receipt_id: saved.data.id } });
  } catch { return NextResponse.json({ error: "We could not prepare a receipt draft. You can still add the transaction manually." }, { status: 502 }); }
}
